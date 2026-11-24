// deno test supabase/functions/notify-question/
// No network: fetch is replaced by a fake that records every request.
import { createHandler, recipientsFor, SECRET_HEADER } from "./handler.ts";
import { buildEmail, escapeHtml, winnipegZone } from "./email.ts";

// --- tiny assertion helpers (no dependencies) --------------------------------
function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertEquals<T>(actual: T, expected: T, msg = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
}

// --- fixtures -----------------------------------------------------------------
const SECRET = "test-secret-123";
const SERVICE_KEY = "sb_secret_test";
const BASE_ENV: Record<string, string> = {
  WEBHOOK_SECRET: SECRET,
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  RESEND_API_KEY: "re_test",
  NOTIFY_FROM: "GracePlace Questions <questions@graceplacewpg.ca>",
  NOTIFY_TO: "office@example.org",
  NOTIFY_TO_SUNDAY: " pastor.a@example.org , pastor.b@example.org,, not-an-email ",
};

const QUESTION = {
  id: 42,
  created_at: "2026-11-23T01:30:00+00:00", // Sun 22 Nov 2026, evening in Winnipeg
  question: `What about <script>alert("x")</script> & Romans 8?`,
  name: `Ada <b>"Lovelace"</b>`,
  series_id: 7,
};
const SERIES = { name: "Handling Wrongs By Love", kind: "sunday" as const };

type Call = { url: string; init: RequestInit };

function fakeFetch(opts: {
  question?: unknown;
  series?: unknown;
  resendStatus?: number;
  supabaseStatus?: number;
} = {}) {
  const calls: Call[] = [];
  const fn = (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/rest/v1/")) {
      if (opts.supabaseStatus) return Promise.resolve(new Response("boom", { status: opts.supabaseStatus }));
      const body = url.includes("/series_questions?")
        ? (opts.question === undefined ? [QUESTION] : opts.question)
        : (opts.series === undefined ? [SERIES] : opts.series);
      return Promise.resolve(Response.json(body));
    }
    if (url === "https://api.resend.com/emails") {
      const status = opts.resendStatus ?? 200;
      return Promise.resolve(
        status === 200
          ? Response.json({ id: "email_123" })
          : Response.json({ name: "validation_error", message: "bad from" }, { status }),
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fn: fn as typeof fetch, calls };
}

const silent = { info: () => {}, error: () => {} };

function run(opts: {
  env?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  method?: string;
  fetchOpts?: Parameters<typeof fakeFetch>[0];
} = {}) {
  const env = { ...BASE_ENV, ...opts.env };
  const f = fakeFetch(opts.fetchOpts);
  const handler = createHandler({ env: (n) => env[n], fetch: f.fn, log: silent });
  const req = new Request("http://localhost/notify-question", {
    method: opts.method ?? "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? { [SECRET_HEADER]: SECRET }) },
    body: opts.method === "GET" ? undefined : JSON.stringify(
      opts.body ?? {
        type: "INSERT",
        schema: "public",
        table: "series_questions",
        // Deliberately different from the DB row: the email must use the DB.
        record: { id: 42, question: "SPOOFED TEXT", name: "Spoofer", series_id: 999 },
        old_record: null,
      },
    ),
  });
  return { response: handler(req), calls: f.calls };
}

const resendCall = (calls: Call[]) => calls.find((c) => c.url === "https://api.resend.com/emails");
const resendBody = (calls: Call[]) => JSON.parse(String(resendCall(calls)!.init.body));

// --- security -------------------------------------------------------------------
Deno.test("rejects a request with no secret header, without touching the database or Resend", async () => {
  const { response, calls } = run({ headers: {} });
  assertEquals((await response).status, 401);
  assertEquals(calls.length, 0);
});

Deno.test("rejects a wrong secret", async () => {
  const { response, calls } = run({ headers: { [SECRET_HEADER]: "test-secret-12" } });
  assertEquals((await response).status, 401);
  assertEquals(calls.length, 0);
});

Deno.test("fails closed when WEBHOOK_SECRET is not set", async () => {
  const { response, calls } = run({ env: { WEBHOOK_SECRET: undefined }, headers: {} });
  assertEquals((await response).status, 500);
  assertEquals(calls.length, 0);
});

Deno.test("only POST is accepted", async () => {
  const { response } = run({ method: "GET" });
  assertEquals((await response).status, 405);
});

Deno.test("ignores payloads that are not an INSERT on public.series_questions", async () => {
  for (
    const body of [
      { type: "UPDATE", schema: "public", table: "series_questions", record: { id: 1 } },
      { type: "INSERT", schema: "public", table: "series", record: { id: 1 } },
      { type: "INSERT", schema: "public", table: "series_questions", record: {} },
      { type: "INSERT", schema: "public", table: "series_questions", record: { id: "1;drop" } },
    ]
  ) {
    const { response, calls } = run({ body });
    assertEquals((await response).status, 400, JSON.stringify(body));
    assertEquals(calls.length, 0);
  }
});

// --- happy path ---------------------------------------------------------------
Deno.test("sends one email built from the database row, not the payload", async () => {
  const { response, calls } = run();
  const res = await response;
  assertEquals(res.status, 200);

  // Database reads use the service key and the id from the payload.
  const rest = calls.filter((c) => c.url.includes("/rest/v1/"));
  assertEquals(rest.map((c) => c.url), [
    "https://proj.supabase.co/rest/v1/series_questions?id=eq.42&select=id,created_at,question,name,series_id",
    "https://proj.supabase.co/rest/v1/series?id=eq.7&select=name,kind",
  ]);
  const h = rest[0].init.headers as Record<string, string>;
  assertEquals(h.apikey, SERVICE_KEY);
  assert(!("Authorization" in h), "sb_secret_ keys are not sent as a bearer token");

  // Exactly one email.
  assertEquals(calls.filter((c) => c.url.startsWith("https://api.resend.com")).length, 1);
  const call = resendCall(calls)!;
  const headers = call.init.headers as Record<string, string>;
  assertEquals(headers.Authorization, "Bearer re_test");
  assertEquals(headers["Idempotency-Key"], "series-question-42");

  const body = resendBody(calls);
  assertEquals(body.from, BASE_ENV.NOTIFY_FROM);
  assertEquals(body.to, ["pastor.a@example.org", "pastor.b@example.org"]);
  assertEquals(body.reply_to, "graceplacewpg@gmail.com");
  assertEquals(body.subject, "New question: Handling Wrongs By Love");

  // User input is escaped in HTML, and the spoofed payload text is not used.
  assert(!body.html.includes("<script>"), "raw <script> must not appear");
  assert(body.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Romans 8?"), "question escaped");
  assert(body.html.includes("Ada &lt;b&gt;&quot;Lovelace&quot;&lt;/b&gt;"), "name escaped");
  assert(!body.html.includes("SPOOFED") && !body.text.includes("SPOOFED"), "payload text ignored");
  assert(body.html.includes("Sunday series: Handling Wrongs By Love"));
  assert(body.html.includes('href="https://graceplacewpg.ca/admin"'));

  // Plain-text part carries the same facts.
  assert(body.text.includes("Series: Sunday series: Handling Wrongs By Love"));
  assert(body.text.includes(`From: Ada <b>"Lovelace"</b>`));
  assert(body.text.includes(QUESTION.question));
  assert(body.text.includes("https://graceplacewpg.ca/admin"));
});

Deno.test("time is shown in Winnipeg time (UTC-5 since Nov 2026), whatever the runtime's tz data", async () => {
  const { response, calls } = run();
  await response;
  // 01:30 UTC on the 23rd is 8:30 p.m. on Sunday the 22nd in Winnipeg (UTC-5).
  // Under the pre-2026 rules it would wrongly be 7:30 p.m.
  const body = resendBody(calls);
  assert(body.text.includes("Asked: Sun, Nov 22, 2026, 8:30 p.m. (Winnipeg time)"), body.text);
  assert(body.html.includes("Sun, Nov 22, 2026, 8:30 p.m. (Winnipeg time)"));
});

Deno.test("winnipegZone() reports which rules this runtime has", () => {
  const zone = winnipegZone();
  assert(zone === "America/Winnipeg" || zone === "Etc/GMT+5", zone);
  console.log(`  (this runtime uses ${zone})`);
});

Deno.test("Anonymous when the name is null or blank", async () => {
  for (const name of [null, "   "]) {
    const { response, calls } = run({ fetchOpts: { question: [{ ...QUESTION, name }] } });
    await response;
    const body = resendBody(calls);
    assert(body.text.includes("From: Anonymous"), String(name));
    assert(body.html.includes(">Anonymous<"), String(name));
  }
});

Deno.test("legacy service_role JWT is also sent as a bearer token", async () => {
  const { response, calls } = run({ env: { SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOi.test.sig" } });
  await response;
  const h = calls[0].init.headers as Record<string, string>;
  assertEquals(h.Authorization, "Bearer eyJhbGciOi.test.sig");
});

// --- recipients -----------------------------------------------------------------
Deno.test("Wednesday series uses NOTIFY_TO_WEDNESDAY when set", async () => {
  const { response, calls } = run({
    env: { NOTIFY_TO_WEDNESDAY: "wed@example.org" },
    fetchOpts: { series: [{ name: "Romans", kind: "wednesday" }] },
  });
  assertEquals((await response).status, 200);
  const body = resendBody(calls);
  assertEquals(body.to, ["wed@example.org"]);
  assertEquals(body.subject, "New question: Romans");
  assert(body.html.includes("Wednesday series: Romans"));
});

Deno.test("falls back to NOTIFY_TO when the kind-specific list is unset or empty", () => {
  const env = (v: Record<string, string>) => (n: string) => v[n];
  assertEquals(recipientsFor("wednesday", env({ NOTIFY_TO: "a@x.org" })), ["a@x.org"]);
  assertEquals(recipientsFor("sunday", env({ NOTIFY_TO: "a@x.org", NOTIFY_TO_SUNDAY: " , " })), ["a@x.org"]);
  assertEquals(recipientsFor("sunday", env({ NOTIFY_TO: "a@x.org", NOTIFY_TO_SUNDAY: "s@x.org" })), ["s@x.org"]);
  assertEquals(recipientsFor(null, env({ NOTIFY_TO: "a@x.org", NOTIFY_TO_SUNDAY: "s@x.org" })), ["a@x.org"]);
});

Deno.test("question without a series (older rows) goes to NOTIFY_TO", async () => {
  const { response, calls } = run({ fetchOpts: { question: [{ ...QUESTION, series_id: null }] } });
  assertEquals((await response).status, 200);
  assertEquals(calls.filter((c) => c.url.includes("/rest/v1/series?")).length, 0);
  const body = resendBody(calls);
  assertEquals(body.to, ["office@example.org"]);
  assertEquals(body.subject, "New question: (no series)");
});

Deno.test("no recipients configured -> 500 and no email", async () => {
  const { response, calls } = run({ env: { NOTIFY_TO: "", NOTIFY_TO_SUNDAY: "" } });
  assertEquals((await response).status, 500);
  assertEquals(resendCall(calls), undefined);
});

// --- failures -------------------------------------------------------------------
Deno.test("Resend failure -> non-200 (shows in function logs)", async () => {
  const errors: unknown[][] = [];
  const env = { ...BASE_ENV };
  const f = fakeFetch({ resendStatus: 422 });
  const handler = createHandler({
    env: (n) => env[n],
    fetch: f.fn,
    log: { info: () => {}, error: (...a) => errors.push(a) },
  });
  const res = await handler(
    new Request("http://x", {
      method: "POST",
      headers: { [SECRET_HEADER]: SECRET },
      body: JSON.stringify({ type: "INSERT", schema: "public", table: "series_questions", record: { id: 42 } }),
    }),
  );
  assertEquals(res.status, 502);
  assert(String(errors[0]?.[0]).includes("422"), "logged with the Resend status");
});

Deno.test("question id not in the database -> 404 and no email", async () => {
  const { response, calls } = run({ fetchOpts: { question: [] } });
  assertEquals((await response).status, 404);
  assertEquals(resendCall(calls), undefined);
});

Deno.test("database error -> 502 and no email", async () => {
  const { response, calls } = run({ fetchOpts: { supabaseStatus: 401 } });
  assertEquals((await response).status, 502);
  assertEquals(resendCall(calls), undefined);
});

Deno.test("missing configuration -> 500 and no email", async () => {
  for (const key of ["RESEND_API_KEY", "NOTIFY_FROM", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const { response, calls } = run({ env: { [key]: undefined } });
    assertEquals((await response).status, 500, key);
    assertEquals(calls.length, 0, key);
  }
});

// --- email helpers ----------------------------------------------------------------
Deno.test("escapeHtml covers the five special characters", () => {
  assertEquals(
    escapeHtml(`<a href="x" title='y'>&</a>`),
    "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
  );
});

Deno.test("subject is one line even if a series name had a newline", () => {
  const e = buildEmail({ ...QUESTION }, { name: "Line one\r\nBcc: x@y.z", kind: "sunday" });
  assertEquals(e.subject, "New question: Line one Bcc: x@y.z");
});
