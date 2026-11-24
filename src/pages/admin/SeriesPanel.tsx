import { useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { seriesKinds, type Series, type SeriesKind } from "../../lib/series";

const MAX_NAME = 120;

export function SeriesPanel({
  series,
  onChange,
}: {
  series: Series[] | undefined;
  onChange: () => Promise<void>;
}) {
  const [error, setError] = useState<string>();

  /** Runs a write, reports a failure, and reloads the list on success. */
  const save = async (write: () => PromiseLike<{ error: unknown; data: unknown[] | null }>) => {
    setError(undefined);
    const { error: writeError, data } = await write();
    // Row-level security hides a refused update as "0 rows", so check the count.
    if (writeError || !data?.length) {
      console.error("Series change failed:", writeError);
      setError("That change was not saved. Refresh the page and try again.");
      return false;
    }
    await onChange();
    return true;
  };

  return (
    <section aria-labelledby="series-heading">
      <h1 id="series-heading" className="font-display text-3xl font-medium text-ink">
        Series
      </h1>
      <p className="mt-1 text-sm text-base-content/60">
        Active series appear in the Ask a Question dropdown. With none active, the page shows
        “Questions open with the next series”.
      </p>

      <NewSeriesForm
        onCreate={(name, kind, active) =>
          save(() => supabase.from("series").insert({ name, kind, active }).select("id"))
        }
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft mt-6 rounded-box text-sm">
          {error}
        </div>
      )}

      {!series && (
        <div className="mt-6 space-y-3" role="status" aria-label="Loading series">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}
      {series?.length === 0 && (
        <p className="mt-8 text-center text-base-content/60">No series yet. Add the first one above.</p>
      )}

      <ul className="mt-6 space-y-3">
        {series?.map((s) => (
          <SeriesRow
            key={s.id}
            series={s}
            onRename={(name) =>
              save(() => supabase.from("series").update({ name }).eq("id", s.id).select("id"))
            }
            onToggle={(active) =>
              save(() => supabase.from("series").update({ active }).eq("id", s.id).select("id"))
            }
          />
        ))}
      </ul>
    </section>
  );
}

function NewSeriesForm({
  onCreate,
}: {
  onCreate: (name: string, kind: SeriesKind, active: boolean) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SeriesKind>("sunday");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    setBusy(true);
    const ok = await onCreate(trimmed, kind, active);
    setBusy(false);
    if (ok) {
      setName("");
      setError(undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card mt-6 border border-base-300 bg-base-200">
      <fieldset className="card-body gap-4 p-5" disabled={busy}>
        <legend className="sr-only">Add a series</legend>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <div>
            <label className="label text-sm" htmlFor="new-series-name">
              New series name
            </label>
            <input
              id="new-series-name"
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => {
                setName(e.target.value);
                setError(undefined);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "new-series-error" : undefined}
              className={`input w-full rounded-box ${error ? "input-error" : ""}`}
            />
            {error && (
              <p id="new-series-error" role="alert" className="mt-1.5 text-sm text-error">
                {error}
              </p>
            )}
          </div>
          <div>
            <label className="label text-sm" htmlFor="new-series-kind">
              Day
            </label>
            <select
              id="new-series-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as SeriesKind)}
              className="select w-full rounded-box"
            >
              {seriesKinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary"
            />
            Active now (open for questions)
          </label>
          <button type="submit" className="btn btn-primary btn-sm h-10 px-5">
            {busy ? <span className="loading loading-spinner size-4" /> : <Plus className="size-4" />}
            Add series
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function SeriesRow({
  series,
  onRename,
  onToggle,
}: {
  series: Series;
  onRename: (name: string) => Promise<boolean>;
  onToggle: (active: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(series.name);
  const [busy, setBusy] = useState(false);
  const kindLabel = seriesKinds.find((k) => k.value === series.kind)?.label ?? series.kind;

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    return ok;
  };

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed === series.name) {
      setEditing(false);
      setDraft(series.name);
      return;
    }
    if (await run(() => onRename(trimmed))) setEditing(false);
  };

  return (
    <li className="card border border-base-300 bg-base-200">
      {/* Stacked on phones (name, then actions); one line from sm up. */}
      <div className="card-body gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="badge badge-ghost badge-sm w-20 shrink-0">{kindLabel}</span>

          {editing ? (
            <form onSubmit={submitRename} className="flex min-w-0 flex-1 flex-wrap gap-2">
              <label htmlFor={`rename-${series.id}`} className="sr-only">
                Series name
              </label>
              <input
                id={`rename-${series.id}`}
                value={draft}
                maxLength={MAX_NAME}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(series.name);
                  }
                }}
                className="input input-sm min-w-0 flex-1 rounded-box"
              />
              <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(series.name);
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
            </form>
          ) : (
            <span className="min-w-0 flex-1 font-medium break-words">{series.name}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-ghost btn-sm"
              aria-label={`Rename ${series.name}`}
            >
              <Pencil className="size-4" strokeWidth={1.75} />
              Rename
            </button>
          )}

          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              role="switch"
              checked={series.active}
              disabled={busy}
              onChange={(e) => void run(() => onToggle(e.target.checked))}
              className="toggle toggle-sm toggle-primary"
              aria-label={`${series.name} active`}
            />
            <span className={series.active ? "text-success" : "text-base-content/50"}>
              {series.active ? "Active" : "Inactive"}
            </span>
          </label>
        </div>
      </div>
    </li>
  );
}
