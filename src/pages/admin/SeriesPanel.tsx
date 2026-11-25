import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  seriesKinds,
  type PastorCandidate,
  type Series,
  type SeriesKind,
  type SeriesRecipient,
} from "../../lib/series";

const MAX_NAME = 120;
const NOT_ADMIN = "can't open the questions page";

type People = {
  candidates: PastorCandidate[];
  /** person ids per series id */
  bySeries: Map<number, Set<string>>;
};

export function SeriesPanel({
  series,
  onChange,
}: {
  series: Series[] | undefined;
  onChange: () => Promise<void>;
}) {
  const [people, setPeople] = useState<People>();
  const [peopleError, setPeopleError] = useState(false);
  const [error, setError] = useState<string>();

  const loadPeople = useCallback(async () => {
    const [candidates, recipients] = await Promise.all([
      supabase.rpc("ask_pastor_candidates"),
      supabase.from("series_recipients").select("series_id, person_id"),
    ]);
    if (candidates.error || recipients.error) {
      console.error("Failed to load pastors:", candidates.error ?? recipients.error);
      setPeopleError(true);
      return;
    }
    const bySeries = new Map<number, Set<string>>();
    for (const r of recipients.data as SeriesRecipient[]) {
      if (!bySeries.has(r.series_id)) bySeries.set(r.series_id, new Set());
      bySeries.get(r.series_id)!.add(r.person_id);
    }
    setPeopleError(false);
    setPeople({ candidates: candidates.data as PastorCandidate[], bySeries });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPeople();
  }, [loadPeople]);

  const reloadAll = () => Promise.all([onChange(), loadPeople()]);

  /** Runs writes in order; each must report the rows it touched (a refusal by
   *  row-level security shows up as 0 rows, not as an error). */
  const run = async (
    steps: { label: string; expect: number; write: () => PromiseLike<{ error: unknown; data: unknown[] | null }> }[],
  ) => {
    setError(undefined);
    for (const step of steps) {
      if (step.expect === 0) continue;
      const { error: writeError, data } = await step.write();
      if (writeError || (data?.length ?? 0) !== step.expect) {
        console.error(`${step.label} failed:`, writeError);
        setError(`${step.label} was not saved. Refresh the page and try again.`);
        await reloadAll();
        return false;
      }
    }
    await reloadAll();
    return true;
  };

  const recipientSteps = (seriesId: number, before: Set<string>, after: Set<string>) => {
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));
    return [
      {
        label: "Removing pastors",
        expect: removed.length,
        write: () =>
          supabase.from("series_recipients").delete().eq("series_id", seriesId).in("person_id", removed).select(),
      },
      {
        label: "Adding pastors",
        expect: added.length,
        write: () =>
          supabase
            .from("series_recipients")
            .insert(added.map((person_id) => ({ series_id: seriesId, person_id })))
            .select(),
      },
    ];
  };

  const create = async (name: string, kind: SeriesKind, active: boolean, personIds: Set<string>) => {
    setError(undefined);
    const { data, error: insertError } = await supabase
      .from("series")
      .insert({ name, kind, active })
      .select("id")
      .single();
    if (insertError || !data) {
      console.error("Series create failed:", insertError);
      setError("The series was not created. Refresh the page and try again.");
      return false;
    }
    const ok = await run(recipientSteps(data.id as number, new Set(), personIds));
    if (!ok) setError("The series was created, but its pastors were not saved. Use Edit on it to add them.");
    return ok;
  };

  return (
    <section aria-labelledby="series-heading">
      <h1 id="series-heading" className="font-display text-3xl font-medium text-ink">
        Series
      </h1>
      <p className="mt-1 text-sm text-base-content/60">
        Active series appear in the Ask a Question dropdown. With none active, the page shows “Questions
        open with the next series”. The pastors you tick for a series are emailed about each new question.
      </p>

      {peopleError && (
        <div role="alert" className="alert alert-error alert-soft mt-6 rounded-box text-sm">
          Could not load the GracePlace Words member list. Refresh the page to try again.
        </div>
      )}

      <NewSeriesForm candidates={people?.candidates} onCreate={create} />

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
        {series?.map((s) => {
          const assigned = people?.bySeries.get(s.id) ?? new Set<string>();
          return (
            <SeriesRow
              key={s.id}
              series={s}
              candidates={people?.candidates}
              assigned={assigned}
              onSave={(name, personIds) =>
                run([
                  {
                    label: "The new name",
                    expect: name === s.name ? 0 : 1,
                    write: () => supabase.from("series").update({ name }).eq("id", s.id).select("id"),
                  },
                  ...recipientSteps(s.id, assigned, personIds),
                ])}
              onToggle={(active) =>
                run([
                  {
                    label: "That change",
                    expect: 1,
                    write: () => supabase.from("series").update({ active }).eq("id", s.id).select("id"),
                  },
                ])}
            />
          );
        })}
      </ul>
    </section>
  );
}

/** Checkbox list of GracePlace Words members. */
function PastorPicker({
  idPrefix,
  candidates,
  selected,
  onChange,
}: {
  idPrefix: string;
  candidates: PastorCandidate[] | undefined;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  return (
    <fieldset className="fieldset gap-1">
      <legend className="label text-sm">Pastors to email about new questions</legend>
      {!candidates ? (
        <span className="loading loading-dots loading-sm text-base-content/50" aria-label="Loading people" />
      ) : candidates.length === 0 ? (
        <p className="text-sm text-base-content/60">No one is on the GracePlace Words member list yet.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2">
          {candidates.map((c) => (
            <li key={c.id}>
              <label
                htmlFor={`${idPrefix}-${c.id}`}
                className="flex cursor-pointer items-start gap-3 rounded-field px-2 py-1.5 hover:bg-base-200"
              >
                <input
                  id={`${idPrefix}-${c.id}`}
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary mt-0.5"
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="break-all text-base-content/55">{c.email}</span>
                  {!c.is_church_admin && (
                    <span className="badge badge-warning badge-soft badge-sm ml-1 align-middle">{NOT_ADMIN}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function NewSeriesForm({
  candidates,
  onCreate,
}: {
  candidates: PastorCandidate[] | undefined;
  onCreate: (name: string, kind: SeriesKind, active: boolean, personIds: Set<string>) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SeriesKind>("sunday");
  const [active, setActive] = useState(true);
  const [pastors, setPastors] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      document.getElementById("new-series-name")?.focus();
      return;
    }
    setBusy(true);
    const ok = await onCreate(trimmed, kind, active, pastors);
    setBusy(false);
    if (ok) {
      setName("");
      setPastors(new Set());
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

        <PastorPicker idPrefix="new-pastor" candidates={candidates} selected={pastors} onChange={setPastors} />

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
  candidates,
  assigned,
  onSave,
  onToggle,
}: {
  series: Series;
  candidates: PastorCandidate[] | undefined;
  assigned: Set<string>;
  onSave: (name: string, personIds: Set<string>) => Promise<boolean>;
  onToggle: (active: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(series.name);
  const [draftPastors, setDraftPastors] = useState<Set<string>>(assigned);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const kindLabel = seriesKinds.find((k) => k.value === series.kind)?.label ?? series.kind;

  const byId = useMemo(() => new Map((candidates ?? []).map((c) => [c.id, c])), [candidates]);
  // Assigned people, in candidate (alphabetical) order; anyone no longer on the
  // member list (removed in Words) is listed last.
  const shown = [
    ...(candidates ?? []).filter((c) => assigned.has(c.id)),
    ...[...assigned].filter((id) => !byId.has(id)).map((id) => ({ id, missing: true as const })),
  ];

  const startEdit = () => {
    setDraftName(series.name);
    setDraftPastors(new Set(assigned));
    setNameError(undefined);
    setEditing(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError("Please enter a name.");
      document.getElementById(`edit-name-${series.id}`)?.focus();
      return;
    }
    setBusy(true);
    const ok = await onSave(trimmed, draftPastors);
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <li className="card border border-base-300 bg-base-200">
      <div className="card-body gap-3 p-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="badge badge-ghost badge-sm w-20 shrink-0">{kindLabel}</span>
            <span className="min-w-0 flex-1 font-medium break-words">{series.name}</span>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4">
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="btn btn-ghost btn-sm"
                aria-label={`Edit ${series.name}`}
              >
                <Pencil className="size-4" strokeWidth={1.75} />
                Edit
              </button>
            )}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                role="switch"
                checked={series.active}
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  await onToggle(e.target.checked);
                  setBusy(false);
                }}
                className="toggle toggle-sm toggle-primary"
                aria-label={`${series.name} active`}
              />
              <span className={series.active ? "text-success" : "text-base-content/50"}>
                {series.active ? "Active" : "Inactive"}
              </span>
            </label>
          </div>
        </div>

        {!editing && (
          <div className="text-sm">
            <span className="text-base-content/60">Pastors: </span>
            {shown.length === 0 ? (
              <span className="text-base-content/60">none, so questions go to the default address</span>
            ) : (
              <ul className="inline">
                {shown.map((p, i) => (
                  <li key={p.id} className="inline">
                    {"missing" in p ? (
                      <span className="text-base-content/50 italic">removed from GracePlace Words</span>
                    ) : (
                      <>
                        <span className="font-medium">{p.name}</span>
                        {!p.is_church_admin && (
                          <span className="badge badge-warning badge-soft badge-sm ml-1 align-middle">{NOT_ADMIN}</span>
                        )}
                      </>
                    )}
                    {i < shown.length - 1 && <span className="text-base-content/40">, </span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {editing && (
          <form onSubmit={submit} noValidate className="space-y-4 border-t border-base-300 pt-4">
            <fieldset className="space-y-4" disabled={busy}>
              <legend className="sr-only">Edit {series.name}</legend>
              <div>
                <label className="label text-sm" htmlFor={`edit-name-${series.id}`}>
                  Series name
                </label>
                <input
                  id={`edit-name-${series.id}`}
                  value={draftName}
                  maxLength={MAX_NAME}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setNameError(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditing(false);
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? `edit-name-error-${series.id}` : undefined}
                  className={`input w-full rounded-box ${nameError ? "input-error" : ""}`}
                />
                {nameError && (
                  <p id={`edit-name-error-${series.id}`} role="alert" className="mt-1.5 text-sm text-error">
                    {nameError}
                  </p>
                )}
              </div>
              <PastorPicker
                idPrefix={`edit-pastor-${series.id}`}
                candidates={candidates}
                selected={draftPastors}
                onChange={setDraftPastors}
              />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">
                  {busy && <span className="loading loading-spinner size-4" />}
                  Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </li>
  );
}
