/**
 * Length rules for the Ask page, matching the check constraints on
 * public.series_questions: question 5 to 1000 characters, name at most 80.
 *
 * Lengths are counted in characters the way Postgres char_length does (code
 * points), not JavaScript string length (UTF-16 units), so an emoji counts as
 * one character here and in the database.
 */

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 1000;
export const NAME_MAX = 80;

/** Characters as Postgres counts them. */
export const charCount = (value: string) => [...value].length;

export const tooShortMessage = (typed: number) =>
  `Please enter at least ${QUESTION_MIN} characters (you've typed ${typed}).`;
export const QUESTION_TOO_LONG = `Questions can be up to ${QUESTION_MAX} characters`;
export const NAME_TOO_LONG = `Names can be up to ${NAME_MAX} characters`;

/**
 * Message for the question field, or undefined when it is fine.
 * "Too long" shows as soon as it happens; "too short" only once the visitor
 * has tried to submit (checkShort), so the field is not flagged while they
 * are still typing their first words.
 */
export function questionLengthMessage(raw: string, checkShort: boolean): string | undefined {
  const n = charCount(raw.trim());
  if (n > QUESTION_MAX) return QUESTION_TOO_LONG;
  if (checkShort && n < QUESTION_MIN) return tooShortMessage(n);
  return undefined;
}

/** Message for the (optional) name field, or undefined when it is fine. */
export function nameLengthMessage(raw: string): string | undefined {
  return charCount(raw.trim()) > NAME_MAX ? NAME_TOO_LONG : undefined;
}

export type LengthField = "question" | "name";

/**
 * Turns a database check-constraint failure (Postgres code 23514) into the
 * matching field message. The constraint name in the error decides the field
 * when it mentions "name"; otherwise the values decide, and a question
 * failure the browser did not predict still gets a length message rather than
 * the generic one.
 */
export function messageForCheckViolation(
  errorText: string,
  values: { question: string; name: string },
): { field: LengthField; message: string } {
  // The table name contains "question", so look only at the rest of the text
  // (normally `violates check constraint "<constraint name>"`).
  const rest = errorText.replace(/series_questions/gi, "");
  const saysName = /name/i.test(rest);
  const saysQuestion = /question/i.test(rest);

  const field: LengthField =
    saysName && !saysQuestion ? "name"
    : saysQuestion && !saysName ? "question"
    : nameLengthMessage(values.name) ? "name"
    : "question";

  if (field === "name") return { field, message: NAME_TOO_LONG };
  const n = charCount(values.question.trim());
  return { field, message: n < QUESTION_MIN ? tooShortMessage(n) : QUESTION_TOO_LONG };
}
