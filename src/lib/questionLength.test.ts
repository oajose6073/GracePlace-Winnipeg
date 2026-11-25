// npm test  (Node's built-in runner; no dependencies)
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  charCount,
  messageForCheckViolation,
  NAME_TOO_LONG,
  nameLengthMessage,
  QUESTION_TOO_LONG,
  questionLengthMessage,
  tooShortMessage,
} from "./questionLength.ts";

test("too-short message uses the exact wording and the trimmed count", () => {
  assert.equal(questionLengthMessage("  Why ", true), "Please enter at least 5 characters (you've typed 3).");
  assert.equal(questionLengthMessage("", true), "Please enter at least 5 characters (you've typed 0).");
  assert.equal(questionLengthMessage("    ", true), tooShortMessage(0));
});

test("too-short is only reported once the visitor has tried to submit", () => {
  assert.equal(questionLengthMessage("Why", false), undefined);
});

test("5 to 1000 characters is valid, so the message clears", () => {
  assert.equal(questionLengthMessage("Why?!", true), undefined);
  assert.equal(questionLengthMessage("x".repeat(1000), true), undefined);
  assert.equal(questionLengthMessage(`  ${"x".repeat(1000)}  `, true), undefined, "surrounding spaces are trimmed");
});

test("over 1000 shows the limit message immediately, before any submit", () => {
  assert.equal(questionLengthMessage("x".repeat(1001), false), "Questions can be up to 1000 characters");
  assert.equal(QUESTION_TOO_LONG, "Questions can be up to 1000 characters");
});

test("names: up to 80 is fine, 81 shows the message", () => {
  assert.equal(nameLengthMessage(""), undefined);
  assert.equal(nameLengthMessage("n".repeat(80)), undefined);
  assert.equal(nameLengthMessage("n".repeat(81)), "Names can be up to 80 characters");
  assert.equal(nameLengthMessage(` ${"n".repeat(80)} `), undefined, "trimmed before counting");
});

test("characters are counted like Postgres char_length (an emoji is one)", () => {
  assert.equal("🙏".length, 2, "JavaScript counts UTF-16 units");
  assert.equal(charCount("🙏"), 1);
  assert.equal(questionLengthMessage("🙏🙏🙏🙏🙏", true), undefined, "five emoji = five characters");
  assert.equal(questionLengthMessage("🙏".repeat(1000), false), undefined, "1000 emoji is not over the limit");
  assert.equal(questionLengthMessage("🙏".repeat(1001), false), QUESTION_TOO_LONG);
});

test("server check violation (23514) maps to the right field and message", () => {
  const err = (constraint: string) =>
    `new row for relation "series_questions" violates check constraint "${constraint}"`;

  assert.deepEqual(
    messageForCheckViolation(err("series_questions_question_check"), { question: "Why", name: "" }),
    { field: "question", message: tooShortMessage(3) },
  );
  assert.deepEqual(
    messageForCheckViolation(err("series_questions_question_length"), { question: "x".repeat(1200), name: "" }),
    { field: "question", message: QUESTION_TOO_LONG },
  );
  assert.deepEqual(
    messageForCheckViolation(err("series_questions_name_check"), { question: "A fine question", name: "n".repeat(90) }),
    { field: "name", message: NAME_TOO_LONG },
  );
  // Unhelpful constraint name: the values decide.
  assert.deepEqual(
    messageForCheckViolation(err("chk_1"), { question: "A fine question", name: "n".repeat(81) }),
    { field: "name", message: NAME_TOO_LONG },
  );
  assert.deepEqual(
    messageForCheckViolation(err("chk_1"), { question: "Hi", name: "" }),
    { field: "question", message: tooShortMessage(2) },
  );
});
