/**
 * Saves a sermon-series question to the Supabase `series_questions` table
 * through its REST API.
 *
 * The publishable key is public by design: it is compiled into the bundle and
 * only works within the table's row-level security, which allows `anon` to
 * insert and nothing else. Visitors can submit questions but never read them.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the Supabase variables were not set at build time. */
export const questionsConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type Question = {
  series: string;
  question: string;
  /** Optional. Left out of the row entirely when blank. */
  name?: string;
};

export async function submitQuestion({ series, question, name }: Question): Promise<void> {
  if (!questionsConfigured) throw new Error("Supabase is not configured");

  const row: Record<string, string> = { series, question };
  if (name) row.name = name;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/series_questions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY!,
      "Content-Type": "application/json",
      // Nothing is read back: anon has no select permission on this table.
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) throw new Error(`Supabase responded ${response.status}`);
}
