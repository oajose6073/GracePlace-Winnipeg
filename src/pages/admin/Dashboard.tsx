import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Series } from "../../lib/series";
import { QuestionsPanel } from "./QuestionsPanel";
import { SeriesPanel } from "./SeriesPanel";

const TABS = [
  { id: "questions", label: "Questions" },
  { id: "series", label: "Series" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("questions");
  const [series, setSeries] = useState<Series[]>();
  const [seriesError, setSeriesError] = useState(false);

  const loadSeries = useCallback(async () => {
    const { data, error } = await supabase
      .from("series")
      .select("id, name, kind, active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load series:", error);
      setSeriesError(true);
      return;
    }
    setSeriesError(false);
    setSeries(data as Series[]);
  }, []);

  useEffect(() => {
    // Fetch on mount; state is set when the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSeries();
  }, [loadSeries]);

  return (
    <div>
      <div role="tablist" aria-label="Admin sections" className="tabs tabs-box w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`tab px-5 ${tab === t.id ? "tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {seriesError && (
        <div role="alert" className="alert alert-error alert-soft mt-6 rounded-box text-sm">
          Could not load the series list. Refresh the page to try again.
        </div>
      )}

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="mt-8"
      >
        {tab === "questions" ? (
          <QuestionsPanel series={series} />
        ) : (
          <SeriesPanel series={series} onChange={loadSeries} />
        )}
      </div>
    </div>
  );
}
