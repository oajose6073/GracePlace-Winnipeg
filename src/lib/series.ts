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

/** "Sunday series: Handling Wrongs By Love" */
export const seriesLabel = (series: Pick<Series, "kind" | "name">) =>
  `${series.kind === "sunday" ? "Sunday" : "Wednesday"} series: ${series.name}`;
