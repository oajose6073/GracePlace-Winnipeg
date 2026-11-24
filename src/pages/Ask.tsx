import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, MessageCircleQuestion, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { church, questionMaxLength } from "../data/site";
import { fetchActiveSeries, submitQuestion, type ActiveSeries } from "../lib/questions";
import { seriesLabel } from "../lib/series";

const EMPTY = { seriesId: "", name: "", question: "", website: "" };

type Field = "seriesId" | "question";
type Errors = Partial<Record<Field, string>>;

type SeriesState =
  | { status: "loading" }
  | { status: "ready"; series: ActiveSeries[] }
  | { status: "failed" };

export default function Ask() {
  const [seriesState, setSeriesState] = useState<SeriesState>({ status: "loading" });
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
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

  const set = (field: keyof typeof EMPTY, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = values.question.trim();
    const found: Errors = {};
    if (!chosen) found.seriesId = "Please choose which series your question is about.";
    if (!question) found.question = "Please write your question.";
    else if (question.length > questionMaxLength) {
      found.question = `Please keep your question under ${questionMaxLength} characters.`;
    }
    setErrors(found);

    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid || !chosen) {
      document.getElementById(firstInvalid === "seriesId" ? "ask-series" : "question")?.focus();
      return;
    }

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
      console.error(err);
      setStatus("failed");
    }
  };

  const askAnother = () => {
    // Keep the series: a second question is usually about the same one.
    setValues({ ...EMPTY, seriesId: values.seriesId });
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
                        aria-invalid={Boolean(errors.seriesId)}
                        aria-describedby={errors.seriesId ? "series-error" : undefined}
                        className={`select w-full rounded-box ${
                          errors.seriesId ? "select-error" : ""
                        }`}
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
                      {errors.seriesId && (
                        <p id="series-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.seriesId}
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
                        maxLength={100}
                        placeholder="Leave blank to ask anonymously"
                        value={values.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="input w-full rounded-box"
                      />
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="question">
                        Question
                      </label>
                      <textarea
                        id="question"
                        name="question"
                        rows={6}
                        maxLength={questionMaxLength}
                        placeholder="What would you like to understand better?"
                        value={values.question}
                        onChange={(e) => set("question", e.target.value)}
                        aria-invalid={Boolean(errors.question)}
                        aria-describedby={`question-count${errors.question ? " question-error" : ""}`}
                        className={`textarea w-full rounded-box ${
                          errors.question ? "textarea-error" : ""
                        }`}
                      />
                      <div className="mt-1.5 flex items-start gap-4">
                        {errors.question && (
                          <p id="question-error" role="alert" className="text-sm text-error">
                            {errors.question}
                          </p>
                        )}
                        <p
                          id="question-count"
                          className={`ml-auto shrink-0 text-xs tabular-nums ${
                            questionMaxLength - values.question.length < 50
                              ? "text-warning"
                              : "text-base-content/50"
                          }`}
                        >
                          {values.question.length} / {questionMaxLength}
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
