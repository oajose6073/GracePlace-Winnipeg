type SectionHeadingProps = {
  label: string;
  title: string;
  sub?: string;
  /** Centres the block and its max-width constraint. */
  centered?: boolean;
};

export function SectionHeading({ label, title, sub, centered = false }: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : ""}>
      <p className="text-[11px] tracking-[0.14em] text-primary uppercase">{label}</p>
      <h2 className="mt-2 font-display text-3xl leading-tight font-medium text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-3 max-w-lg text-base text-base-content/65 ${centered ? "mx-auto" : ""}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
