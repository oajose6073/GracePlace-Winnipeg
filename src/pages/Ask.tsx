import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, MessageCircleQuestion, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { church } from "../data/site";
import {
  charCount,
  messageForCheckViolation,
  nameLengthMessage,
  QUESTION_MAX,
  questionLengthMessage,
  type LengthField,
} from "../lib/questionLength";
import { fetchActiveSeries, SubmitError, submitQuestion, type ActiveSeries } from "../lib/questions";
import { seriesLabel } from "../lib/series";

const EMPTY = { seriesId: "", name: "", question: "", website: "" };

const FIELD_IDS = { seriesId: "ask-series", name: "ask-name", question: "question" } as const;

type SeriesState =
  | { status: "loading" }
  | { status: "ready"; series: ActiveSeries[] }
  | { status: "failed" };

export default function Ask() {
  const [seriesState, setSeriesState] = useState<SeriesState>({ status: "loading" });
  const [values, setValues] = useState(EMPTY);
  const [seriesError, setSeriesError] = useState<string>();
  // "Too short" is only reported once the visitor has tried to submit.
  const [checkShort, setCheckShort] = useState(false);
  // A length rejection from the database, shown until that field is edited.
  const [serverError, setServerError] = useState<{ field: LengthField; message: string }>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    document.title = "Ask a Question — GracePlace Winnipeg";
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchActiveSeries(controller.signal)
      .then((series) => {
        setSeriesState({ status: "ready", series });
        // With only one series open there is nothing to choose.
        if (series.length === 1) setValues((v) => ({ ...v, seriesId: String(series[0].id) }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load sermon series:", error);
        setSeriesState({ status: "failed" });
      });
    return () => controller.abort();
  }, []);

  const series = seriesState.status === "ready" ? seriesState.series : [];
  const chosen = series.find((s) => String(s.id) === values.seriesId);

  // Length messages are derived from the current values, so they update as
  // the visitor types and disappear the moment the input becomes valid.
  const questionError =
    serverError?.field === "question" ? serverError.message : questionLengthMessage(values.question, checkShort);
  const nameError = serverError?.field === "name" ? serverError.message : nameLengthMessage(values.name);
  // Same counting as the database (characters, not UTF-16 units).
  const questionCount = charCount(values.question);

  const set = (field: keyof typeof EMPTY, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field === "seriesId") setSeriesError(undefined);
    if (serverError?.field === field) setServerError(undefined);
  };

  const focusField = (field: keyof typeof FIELD_IDS) => document.getElementById(FIELD_IDS[field])?.focus();

  // A field inside the disabled "sending" fieldset cannot take focus, so a
  // focus request made while sending is applied once the form is enabled again.
  const pendingFocus = useRef<keyof typeof FIELD_IDS>(undefined);
  useEffect(() => {
    if (status !== "sending" && pendingFocus.current) {
      focusField(pendingFocus.current);
      pendingFocus.current = undefined;
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckShort(true);
    setServerError(undefined);

    // Nothing is sent until every field passes. Fields are checked in page order
    // so focus lands on the first problem.
    const invalid = {
      seriesId: chosen ? undefined : "Please choose which series your question is about.",
      name: nameLengthMessage(values.name),
      question: questionLengthMessage(values.question, true),
    };
    setSeriesError(invalid.seriesId);
    const firstInvalid = (Object.keys(invalid) as (keyof typeof invalid)[]).find((k) => invalid[k]);
    if (firstInvalid || !chosen) {
      focusField(firstInvalid ?? "seriesId");
      return;
    }
    const question = values.question.trim();

    // The honeypot is invisible to people, so anything typed into it came from
    // a bot. Show the normal thank-you and quietly drop the submission.
    if (values.website) {
      setStatus("sent");
      return;
    }

    setStatus("sending");
    try {
      await submitQuestion({ seriesId: chosen.id, question, name: values.name.trim() });
      setStatus("sent");
    } catch (err) {
      // A check-constraint rejection (23514) is a length problem, not a
      // failure: show it on the field instead of the generic message.
      if (err instanceof SubmitError && err.code === "23514") {
        const mapped = messageForCheckViolation(err.message, values);
        setServerError(mapped);
        pendingFocus.current = mapped.field;
        setStatus("idle");
        return;
      }
      console.error(err);
      setStatus("failed");
    }
  };

  const askAnother = () => {
    // Keep the series: a second question is usually about the same one.
    setValues({ ...EMPTY, seriesId: values.seriesId });
    setCheckShort(false);
    setServerError(undefined);
    setStatus("idle");
  };

  const open = seriesState.status === "ready" && series.length > 0;
  const closed = seriesState.status === "ready" && series.length === 0;

  return (
    <>
      <PageHero
        badge="Sermon series"
        title={
          <>
            Ask a <em className="text-primary italic">question</em>
          </>
        }
      >
        {closed
          ? "Have a question about a sermon series? This is where you can send it in."
          : "Something from a current sermon series on your mind? Send it in. Your name is optional."}
      </PageHero>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          {seriesState.status === "loading" && (
            <div
              role="status"
              aria-label="Loading the current series"
              className="card border border-base-300 bg-base-200"
            >
              <div className="card-body gap-4 p-6 sm:p-9">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-36 w-full" />
              </div>
            </div>
          )}

          {seriesState.status === "failed" && (
            <div role="alert" className="alert alert-error alert-soft rounded-box text-sm">
              <span>
                We could not load the current series. Please refresh the page, or email your
                question to{" "}
                <a className="link" href={`mailto:${church.email}`}>
                  {church.email}
                </a>
                .
              </span>
            </div>
          )}

          {closed && (
            <Reveal>
              <div className="card border border-base-300 bg-base-200 text-center">
                <div className="card-body items-center gap-3 p-10 sm:p-14">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CalendarClock className="size-8" strokeWidth={1.5} />
                  </span>
                  <h2 className="font-display text-3xl font-medium text-ink">
                    Questions open with the next series
                  </h2>
                  <p className="max-w-md text-[15px] text-base-content/65">
                    Check back when our next sermon series begins. In the meantime you can email us
                    at{" "}
                    <a className="link link-hover text-primary" href={`mailto:${church.email}`}>
                      {church.email}
                    </a>
                    .
                  </p>
                </div>
              </div>
            </Reveal>
          )}

          {open && status === "sent" && (
            <div role="status" className="card border border-primary/25 bg-base-200 text-center">
              <div className="card-body items-center gap-3 p-10 sm:p-14">
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CheckCircle2 className="size-8" strokeWidth={1.5} />
                </span>
                <h2 className="font-display text-3xl font-medium text-ink">Thank you</h2>
                <p className="max-w-md text-[15px] text-base-content/65">
                  Your question{chosen ? ` about ${chosen.name}` : ""} has been received. Thank you
                  for engaging with the word alongside us.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={askAnother} className="btn btn-primary h-11 px-7">
                    Ask another question
                  </button>
                  <Link to="/" className="btn h-11 border-base-300 bg-base-100 px-7">
                    Back to home
                  </Link>
                </div>
              </div>
            </div>
          )}

          {open && status !== "sent" && (
            <Reveal>
              <form
                onSubmit={handleSubmit}
                noValidate
                className="card border border-base-300 bg-base-200"
              >
                <div className="card-body gap-0 p-6 sm:p-9">
                  <fieldset className="fieldset gap-4" disabled={status === "sending"}>
                    <legend className="flex items-center gap-2 text-[11px] tracking-[0.14em] text-primary uppercase">
                      <MessageCircleQuestion className="size-4" strokeWidth={1.75} />
                      Your question
                    </legend>

                    <div>
                      <label className="label text-sm" htmlFor="ask-series">
                        Series
                      </label>
                      <select
                        id="ask-series"
                        name="series"
                        required
                        value={values.seriesId}
                        onChange={(e) => set("seriesId", e.target.value)}
                        aria-invalid={Boolean(seriesError)}
                        aria-describedby={seriesError ? "series-error" : undefined}
                        className={`select w-full rounded-box ${seriesError ? "select-error" : ""}`}
                      >
                        <option value="" disabled>
                          Choose a series
                        </option>
                        {series.map((s) => (
                          <option key={s.id} value={s.id}>
                            {seriesLabel(s)}
                          </option>
                        ))}
                      </select>
                      {seriesError && (
                        <p id="series-error" role="alert" className="mt-1.5 text-sm text-error">
                          {seriesError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="ask-name">
                        Name <span className="text-base-content/50">(optional)</span>
                      </label>
                      <input
                        id="ask-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Leave blank to ask anonymously"
                        value={values.name}
                        onChange={(e) => set("name", e.target.value)}
                        aria-invalid={Boolean(nameError)}
                        aria-describedby={nameError ? "name-error" : undefined}
                        className={`input w-full rounded-box ${nameError ? "input-error" : ""}`}
                      />
                      {nameError && (
                        <p id="name-error" role="alert" className="mt-1.5 text-sm text-error">
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="question">
                        Question
                      </label>
                      <textarea
                        id="question"
                        name="question"
                        rows={6}
                        placeholder="What would you like to understand better?"
                        value={values.question}
                        onChange={(e) => set("question", e.target.value)}
                        aria-invalid={Boolean(questionError)}
                        aria-describedby={`question-count${questionError ? " question-error" : ""}`}
                        className={`textarea w-full rounded-box ${questionError ? "textarea-error" : ""}`}
                      />
                      <div className="mt-1.5 flex items-start gap-4">
                        {questionError && (
                          <p id="question-error" role="alert" className="text-sm text-error">
                            {questionError}
                          </p>
                        )}
                        <p
                          id="question-count"
                          className={`ml-auto shrink-0 text-xs tabular-nums ${
                            questionCount > QUESTION_MAX
                              ? "font-medium text-error"
                              : QUESTION_MAX - questionCount < 50
                                ? "text-warning"
                                : "text-base-content/50"
                          }`}
                        >
                          {questionCount} / {QUESTION_MAX}
                        </p>
                      </div>
                    </div>

                    {/* Honeypot: hidden from people and assistive tech, left for bots to fill. */}
                    <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
                      <label htmlFor="ask-website">Website</label>
                      <input
                        id="ask-website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={values.website}
                        onChange={(e) => set("website", e.target.value)}
                      />
                    </div>

                    {status === "failed" && (
                      <div role="alert" className="alert alert-error alert-soft rounded-box text-sm">
                        <span>
                          That did not go through. Please try again, or email your question to{" "}
                          <a className="link" href={`mailto:${church.email}`}>
                            {church.email}
                          </a>
                          .
                        </span>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary mt-2 h-12 w-full text-[15px]">
                      {status === "sending" ? (
                        <span className="loading loading-spinner size-4" />
                      ) : (
                        <Send className="size-4" strokeWidth={2} />
                      )}
                      {status === "sending" ? "Sending" : "Send question"}
                    </button>
                  </fieldset>
                </div>
              </form>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
