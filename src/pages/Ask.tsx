import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, MessageCircleQuestion, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { church, currentSeries, questionMaxLength } from "../data/site";
import { submitQuestion } from "../lib/submitQuestion";

const EMPTY = { name: "", question: "", website: "" };

export default function Ask() {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    document.title = "Ask a Question — GracePlace Winnipeg";
  }, []);

  const set = (field: keyof typeof EMPTY, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field === "question") setError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = values.question.trim();
    if (!question) {
      setError("Please write your question.");
      document.getElementById("question")?.focus();
      return;
    }
    if (question.length > questionMaxLength) {
      setError(`Please keep your question under ${questionMaxLength} characters.`);
      document.getElementById("question")?.focus();
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
      await submitQuestion({ series: currentSeries, question, name: values.name.trim() });
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setStatus("failed");
    }
  };

  const askAnother = () => {
    setValues(EMPTY);
    setStatus("idle");
  };

  const remaining = questionMaxLength - values.question.length;

  return (
    <>
      <PageHero
        badge={currentSeries ? `Series · ${currentSeries}` : "Sermon series"}
        title={
          <>
            Ask a <em className="text-primary italic">question</em>
          </>
        }
      >
        Something from the current sermon series on your mind? Send it in. Your name is optional.
      </PageHero>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            {!currentSeries ? (
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
            ) : status === "sent" ? (
              <div role="status" className="card border border-primary/25 bg-base-200 text-center">
                <div className="card-body items-center gap-3 p-10 sm:p-14">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CheckCircle2 className="size-8" strokeWidth={1.5} />
                  </span>
                  <h2 className="font-display text-3xl font-medium text-ink">Thank you</h2>
                  <p className="max-w-md text-[15px] text-base-content/65">
                    Your question about {currentSeries} has been received. Thank you for engaging
                    with the word alongside us.
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
            ) : (
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
                        Question about {currentSeries}
                      </label>
                      <textarea
                        id="question"
                        name="question"
                        rows={6}
                        maxLength={questionMaxLength}
                        placeholder="What would you like to understand better?"
                        value={values.question}
                        onChange={(e) => set("question", e.target.value)}
                        aria-invalid={Boolean(error)}
                        aria-describedby={`question-count${error ? " question-error" : ""}`}
                        className={`textarea w-full rounded-box ${error ? "textarea-error" : ""}`}
                      />
                      <div className="mt-1.5 flex items-start gap-4">
                        {error && (
                          <p id="question-error" role="alert" className="text-sm text-error">
                            {error}
                          </p>
                        )}
                        <p
                          id="question-count"
                          className={`ml-auto shrink-0 text-xs tabular-nums ${
                            remaining < 50 ? "text-warning" : "text-base-content/50"
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
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
