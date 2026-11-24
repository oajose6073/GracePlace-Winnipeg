import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, RefreshCw, Undo2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { seriesLabel, type Series } from "../../lib/series";

type Question = {
  id: number | string;
  created_at: string;
  /** Old free-text series name. Questions from before the series table only have this. */
  series: string | null;
  series_id: number | null;
  question: string;
  name: string | null;
  answered: boolean | null;
};

const winnipegTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Winnipeg",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/** Filter keys: "all", "s:<series id>", or "old:<series text>" for older rows. */
const keyFor = (q: Question) => (q.series_id != null ? `s:${q.series_id}` : `old:${q.series ?? ""}`);

export function QuestionsPanel({ series }: { series: Series[] | undefined }) {
  const [questions, setQuestions] = useState<Question[]>();
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("all");
  const [hideAnswered, setHideAnswered] = useState(false);
  const [saving, setSaving] = useState<Question["id"]>();
  const [saveError, setSaveError] = useState<string>();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("series_questions")
      .select("id, created_at, series, series_id, question, name, answered")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("Failed to load questions:", error);
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setQuestions(data as Question[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const seriesById = useMemo(() => new Map((series ?? []).map((s) => [s.id, s])), [series]);

  const labelFor = useCallback(
    (q: Question) => {
      const s = q.series_id != null ? seriesById.get(q.series_id) : undefined;
      if (s) return seriesLabel(s);
      return q.series ? `Earlier: ${q.series}` : "No series";
    },
    [seriesById],
  );

  // One filter option per series, plus one per older free-text series name,
  // each with its question count.
  const options = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions ?? []) counts.set(keyFor(q), (counts.get(keyFor(q)) ?? 0) + 1);
    const fromSeries = (series ?? []).map((s) => ({
      key: `s:${s.id}`,
      label: `${seriesLabel(s)}${s.active ? "" : " (inactive)"}`,
      count: counts.get(`s:${s.id}`) ?? 0,
    }));
    const older = [...counts.keys()]
      .filter((k) => k.startsWith("old:"))
      .map((k) => ({ key: k, label: `Earlier: ${k.slice(4) || "no series"}`, count: counts.get(k)! }));
    return [...fromSeries, ...older];
  }, [questions, series]);

  const visible = (questions ?? []).filter(
    (q) => (filter === "all" || keyFor(q) === filter) && !(hideAnswered && q.answered),
  );

  const setAnswered = async (q: Question, answered: boolean) => {
    setSaving(q.id);
    setSaveError(undefined);
    const { data, error } = await supabase
      .from("series_questions")
      .update({ answered })
      .eq("id", q.id)
      .select("id");
    setSaving(undefined);
    // Row-level security hides a refused update as "0 rows", so check the count.
    if (error || !data?.length) {
      console.error("Failed to update question:", error);
      setSaveError("That change was not saved. Refresh the page and try again.");
      return;
    }
    setQuestions((list) => list?.map((item) => (item.id === q.id ? { ...item, answered } : item)));
  };

  return (
    <section aria-labelledby="questions-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="questions-heading" className="font-display text-3xl font-medium text-ink">
            Questions
          </h1>
          <p className="mt-1 text-sm text-base-content/60">
            Newest first. Times are Winnipeg time.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-ghost btn-sm">
          <RefreshCw className="size-4" strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex w-full items-center gap-3 sm:w-auto">
          <span className="text-sm text-base-content/70">Series</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="select select-sm w-full rounded-box sm:w-80"
          >
            <option value="all">All series ({questions?.length ?? 0})</option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideAnswered}
            onChange={(e) => setHideAnswered(e.target.checked)}
            className="checkbox checkbox-sm checkbox-primary"
          />
          Hide answered
        </label>
      </div>

      {loadError && (
        <div role="alert" className="alert alert-error alert-soft mt-6 rounded-box text-sm">
          Could not load questions.
          <button type="button" onClick={() => void load()} className="btn btn-sm">
            <RotateCcw className="size-4" /> Try again
          </button>
        </div>
      )}
      {saveError && (
        <div role="alert" className="alert alert-error alert-soft mt-6 rounded-box text-sm">
          {saveError}
        </div>
      )}

      {!questions && !loadError && (
        <div className="mt-6 space-y-3" role="status" aria-label="Loading questions">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      )}

      {questions && visible.length === 0 && (
        <p className="mt-10 text-center text-base-content/60">
          {questions.length === 0 ? "No questions yet." : "No questions match this filter."}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {visible.map((q) => (
          <li
            key={q.id}
            className={`card border bg-base-200 ${
              q.answered ? "border-base-300 opacity-70" : "border-primary/25"
            }`}
          >
            <div className="card-body gap-3 p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
                <span className="font-medium text-base-content">
                  {q.name?.trim() || "Anonymous"}
                </span>
                <time dateTime={q.created_at}>{winnipegTime.format(new Date(q.created_at))}</time>
                <span className="badge badge-ghost badge-sm">{labelFor(q)}</span>
                {q.answered && <span className="badge badge-success badge-soft badge-sm">Answered</span>}
              </div>
              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{q.question}</p>
              <div>
                {q.answered ? (
                  <button
                    type="button"
                    disabled={saving === q.id}
                    onClick={() => setAnswered(q, false)}
                    className="btn btn-ghost btn-sm"
                  >
                    <Undo2 className="size-4" strokeWidth={1.75} />
                    Mark unanswered
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving === q.id}
                    onClick={() => setAnswered(q, true)}
                    className="btn btn-primary btn-sm"
                  >
                    {saving === q.id ? (
                      <span className="loading loading-spinner size-4" />
                    ) : (
                      <Check className="size-4" strokeWidth={2} />
                    )}
                    Mark answered
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
