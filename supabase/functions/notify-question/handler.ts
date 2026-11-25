// notify-question: emails the pastors when a row is inserted into
// public.series_questions. Called by a Database Webhook (pg_net), which sends
// the request after the insert has committed, so nothing here can block or
// undo saving the question.
//
// The handler takes its environment and fetch as arguments so it can be
// tested without network access; index.ts wires in the real ones.

import { buildEmail, type QuestionRow, REPLY_TO, type SeriesRow } from "./email.ts";

export const SECRET_HEADER = "x-webhook-secret";
const RESEND_URL = "https://api.resend.com/emails";

export type Deps = {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  log?: Pick<Console, "info" | "error">;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Constant-time comparison (hashing first makes the lengths equal). */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const isEmail = (s: string) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s);

/** "a@x.org, b@y.org," -> ["a@x.org", "b@y.org"] */
export const parseRecipients = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isEmail);

/** A series_recipients row with its person embedded (PostgREST resource embedding). */
export type RecipientRow = { person: { email: string | null; removed_at: string | null } | null };

/**
 * The series' assigned people's current email addresses: removed people
 * (person.removed_at set) and unusable addresses are skipped, duplicates are
 * dropped case-insensitively.
 */
export function assignedEmails(rows: RecipientRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const p = row.person;
    if (!p || p.removed_at) continue;
    const email = (p.email ?? "").trim();
    if (!isEmail(email) || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push(email);
  }
  return out;
}

export function createHandler({ env, fetch, log = console }: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json(405, { error: "method not allowed" });

    // 1. Shared secret. Fail closed if it is not configured.
    const secret = env("WEBHOOK_SECRET");
    if (!secret) {
      log.error("WEBHOOK_SECRET is not set; refusing every request.");
      return json(500, { error: "not configured" });
    }
    if (!(await sameSecret(req.headers.get(SECRET_HEADER) ?? "", secret))) {
      return json(401, { error: "unauthorized" });
    }

    // 2. Webhook payload: only the id of the new row is used from it.
    let id: unknown;
    try {
      const payload = await req.json();
      if (payload?.type !== "INSERT" || payload?.schema !== "public" || payload?.table !== "series_questions") {
        return json(400, { error: "expected an INSERT on public.series_questions" });
      }
      id = payload?.record?.id;
    } catch {
      return json(400, { error: "invalid JSON" });
    }
    if (typeof id !== "number" && !(typeof id === "string" && /^[\w-]{1,64}$/.test(id))) {
      return json(400, { error: "missing record id" });
    }

    // 3. Configuration.
    const supabaseUrl = env("SUPABASE_URL")?.replace(/\/+$/, "");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = env("RESEND_API_KEY");
    const from = env("NOTIFY_FROM");
    if (!supabaseUrl || !serviceKey || !resendKey || !from) {
      log.error("Missing one of SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NOTIFY_FROM.");
      return json(500, { error: "not configured" });
    }

    // 4. Read the question and its series from the database with the service
    //    role, rather than trusting the payload: even a leaked secret can then
    //    only trigger mail about questions that really exist.
    const headers: Record<string, string> = { apikey: serviceKey, Accept: "application/json" };
    // Legacy service_role keys are JWTs and also go in Authorization; the
    // newer sb_secret_ keys are sent as apikey only.
    if (serviceKey.startsWith("eyJ")) headers.Authorization = `Bearer ${serviceKey}`;

    const getRows = async <T>(path: string): Promise<T[]> => {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
      if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return (await res.json()) as T[];
    };
    const getOne = async <T>(path: string): Promise<T | null> => (await getRows<T>(path))[0] ?? null;

    let question: QuestionRow | null;
    let series: SeriesRow | null = null;
    try {
      question = await getOne<QuestionRow>(
        `series_questions?id=eq.${encodeURIComponent(String(id))}&select=id,created_at,question,name,series_id`,
      );
      if (!question) return json(404, { error: "question not found" });
      if (question.series_id != null) {
        series = await getOne<SeriesRow>(`series?id=eq.${question.series_id}&select=name,kind`);
      }
    } catch (error) {
      log.error("Could not read the question from the database:", error);
      return json(502, { error: "database lookup failed" });
    }

    // 5. Recipients: the people assigned to this question's series, with their
    //    current Words email, skipping anyone removed. If none remain (or the
    //    lookup fails), fall back to NOTIFY_TO so the question is not missed.
    let assigned: string[] = [];
    if (question.series_id != null) {
      try {
        assigned = assignedEmails(
          await getRows<RecipientRow>(
            `series_recipients?series_id=eq.${question.series_id}&select=person(email,removed_at)`,
          ),
        );
      } catch (error) {
        log.error("Could not read the series' pastors; falling back to NOTIFY_TO:", error);
      }
    }
    const to = assigned.length ? assigned : parseRecipients(env("NOTIFY_TO"));
    const source = assigned.length ? "series pastors" : "NOTIFY_TO";
    if (!to.length) {
      log.error(`Question ${question.id}: no pastors assigned to its series and NOTIFY_TO is empty.`);
      return json(500, { error: "no recipients configured" });
    }

    // 6. Send. The idempotency key makes a retried or replayed webhook for the
    //    same question a no-op at Resend instead of a second email.
    const email = buildEmail(question, series);
    let res: Response;
    try {
      res = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `series-question-${question.id}`,
        },
        body: JSON.stringify({ from, to, reply_to: REPLY_TO, ...email }),
      });
    } catch (error) {
      log.error("Could not reach Resend:", error);
      return json(502, { error: "email provider unreachable" });
    }

    if (!res.ok) {
      log.error(
        `Resend rejected the email for question ${question.id}: ${res.status} ${(await res.text()).slice(0, 500)}`,
      );
      return json(502, { error: "email provider rejected the message", status: res.status });
    }

    const sent = (await res.json().catch(() => ({}))) as { id?: string };
    log.info(
      `Notified ${to.length} recipient(s) (${source}) about question ${question.id} (resend id ${sent.id ?? "?"}).`,
    );
    return json(200, { ok: true, question: question.id, recipients: to.length, source });
  };
}
