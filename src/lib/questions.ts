/**
 * Public side of the Ask page: reads the active sermon series and saves a
 * question, through Supabase's REST API with the publishable key.
 *
 * The key is public by design. Row-level security lets it read only active
 * series and insert a question only for an active series; it can never read
 * questions back.
 */
import type { Series } from "./series";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the Supabase variables were not set at build time. */
export const questionsConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const rest = (path: string, init: RequestInit = {}) => {
  if (!questionsConfigured) return Promise.reject(new Error("Supabase is not configured"));
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY!, ...init.headers },
  });
};

export type ActiveSeries = Pick<Series, "id" | "name" | "kind">;

/** Active series, Sunday before Wednesday, newest first within each. */
export async function fetchActiveSeries(signal?: AbortSignal): Promise<ActiveSeries[]> {
  const response = await rest(
    "series?select=id,name,kind&active=is.true&order=kind.asc,created_at.desc",
    { signal },
  );
  if (!response.ok) throw new Error(`Supabase responded ${response.status}`);
  return (await response.json()) as ActiveSeries[];
}

export type NewQuestion = {
  seriesId: number;
  question: string;
  /** Optional. Left out of the row entirely when blank. */
  name?: string;
};

/** A rejected insert, carrying the Postgres error code PostgREST returns
 *  (e.g. "23514" for a check-constraint violation). */
export class SubmitError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "SubmitError";
    this.status = status;
    this.code = code;
  }
}

export async function submitQuestion({ seriesId, question, name }: NewQuestion): Promise<void> {
  const row: Record<string, string | number> = { series_id: seriesId, question };
  if (name) row.name = name;

  const response = await rest("series_questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Nothing is read back: anon has no select permission on this table.
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new SubmitError(
      response.status,
      body.code,
      body.message ?? `Supabase responded ${response.status}`,
    );
  }
}
