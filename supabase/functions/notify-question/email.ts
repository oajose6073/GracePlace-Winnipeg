// Builds the notification email for one question. Pure functions, no I/O.

export const ADMIN_URL = "https://graceplacewpg.ca/admin";
export const REPLY_TO = "graceplacewpg@gmail.com";

export type SeriesKind = "sunday" | "wednesday";

export type QuestionRow = {
  id: number | string;
  created_at: string;
  question: string;
  name: string | null;
  series_id: number | null;
};

export type SeriesRow = { name: string; kind: SeriesKind };

export type Email = { subject: string; html: string; text: string };

/** Escapes text for safe use inside HTML element content and attributes. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Manitoba stayed on UTC-5 permanently from 1 Nov 2026 (no more fall-back).
 * Runtimes whose time-zone data predates that change still apply the old
 * rule to America/Winnipeg and would show every winter time an hour early.
 * Detect that by asking what UTC noon on 15 Jan 2027 is in Winnipeg: 7 a.m.
 * under the current rules, 6 a.m. under the old ones.
 */
export function winnipegZone(): string {
  const hour = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Winnipeg",
    hour: "numeric",
    hourCycle: "h23",
  }).format(Date.UTC(2027, 0, 15, 12));
  // Etc/GMT+5 is UTC-5 (the sign in Etc/ names is inverted by convention).
  return hour === "7" ? "America/Winnipeg" : "Etc/GMT+5";
}

const winnipegTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: winnipegZone(),
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** e.g. "Sun, Nov 22, 2026, 8:30 p.m. (Winnipeg time)". The abbreviation is
 *  left out because systems disagree on it (CST, CDT, MBT) after the change. */
export const formatWinnipeg = (iso: string) => `${winnipegTime.format(new Date(iso))} (Winnipeg time)`;

export const kindLabel = (kind: SeriesKind) => (kind === "sunday" ? "Sunday" : "Wednesday");

/** One line, no control characters, reasonable length: safe for a subject. */
const oneLine = (value: string, max = 120) => {
  const flat = value.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

export function buildEmail(question: QuestionRow, series: SeriesRow | null): Email {
  const seriesName = series ? oneLine(series.name) : "(no series)";
  const seriesLine = series ? `${kindLabel(series.kind)} series: ${seriesName}` : "No series";
  const asker = question.name?.trim() || "Anonymous";
  const when = formatWinnipeg(question.created_at);

  const subject = `New question: ${seriesName}`;

  const text = [
    `A new question was asked on graceplacewpg.ca.`,
    ``,
    `Series: ${seriesLine}`,
    `From: ${asker}`,
    `Asked: ${when}`,
    ``,
    question.question,
    ``,
    `See all questions: ${ADMIN_URL}`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#6b6480;white-space:nowrap;vertical-align:top">${label}</td>` +
    `<td style="padding:4px 0;color:#1d1636">${value}</td></tr>`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f6f4fb;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e4e0f0">
    <p style="margin:0 0 4px;color:#b07d1f;font-size:12px;letter-spacing:.12em;text-transform:uppercase">New question</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#1d1636">${escapeHtml(seriesLine)}</h1>
    <table role="presentation" style="border-collapse:collapse;margin-bottom:20px">
      ${row("From", escapeHtml(asker))}
      ${row("Asked", escapeHtml(when))}
    </table>
    <blockquote style="margin:0 0 24px;padding:14px 18px;background:#f6f4fb;border-left:3px solid #dda13b;border-radius:6px;color:#1d1636;white-space:pre-wrap">${
    escapeHtml(question.question)
  }</blockquote>
    <a href="${ADMIN_URL}" style="display:inline-block;background:#dda13b;color:#120c2e;text-decoration:none;font-weight:600;padding:10px 20px;border-radius:999px">Open the questions page</a>
    <p style="margin:20px 0 0;color:#6b6480;font-size:13px">Replies to this email go to ${REPLY_TO}. The person who asked did not leave an email address.</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
