export type SeriesKind = "sunday" | "wednesday";

/** A row of the Supabase `series` table. */
export type Series = {
  id: number;
  name: string;
  kind: SeriesKind;
  active: boolean;
  created_at: string;
};

export const seriesKinds: { value: SeriesKind; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "wednesday", label: "Wednesday" },
];

/** A row of ask_pastor_candidates(): someone on the GracePlace Words member
 *  list who can be emailed about a series. */
export type PastorCandidate = {
  id: string;
  name: string;
  email: string;
  /** In public.admins, so they can open /admin. */
  is_church_admin: boolean;
};

/** A row of the series_recipients table. */
export type SeriesRecipient = { series_id: number; person_id: string };

/** "Sunday series: Handling Wrongs By Love" */
export const seriesLabel = (series: Pick<Series, "kind" | "name">) =>
  `${series.kind === "sunday" ? "Sunday" : "Wednesday"} series: ${series.name}`;
