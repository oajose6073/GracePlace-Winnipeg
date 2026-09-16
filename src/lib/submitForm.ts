import { church } from "../data/site";

/**
 * Delivers a form submission.
 *
 * Set `VITE_FORM_ENDPOINT` to a form backend (Formspree, Basin, Web3Forms and
 * friends all accept a JSON POST) and submissions are sent there directly.
 * Without one configured there is no server to receive the message, so rather
 * than dropping it we hand the visitor a pre-filled email to the church — the
 * message still arrives, and nothing is silently lost.
 */
const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT as string | undefined;

export type SubmitResult = "sent" | "email-fallback";

export async function submitForm(
  subject: string,
  fields: Record<string, string>,
): Promise<SubmitResult> {
  if (ENDPOINT) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: subject, ...fields }),
    });
    if (!response.ok) throw new Error(`Form endpoint responded ${response.status}`);
    return "sent";
  }

  const body = Object.entries(fields)
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  window.location.href =
    `mailto:${church.email}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  return "email-fallback";
}
