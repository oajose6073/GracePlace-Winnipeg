import type { ReactNode } from "react";

type PageHeroProps = {
  badge: string;
  title: ReactNode;
  children: ReactNode;
};

/** The compact navy header used by the Give and Request a Ride pages. */
export function PageHero({ badge, title, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-neutral px-5 pt-16 pb-14 text-center sm:px-8 sm:pt-20 sm:pb-18">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,rgba(221,161,59,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <span className="inline-block rounded-full border border-primary/35 bg-primary/12 px-4 py-1.5 text-[11px] tracking-[0.12em] text-primary uppercase">
          {badge}
        </span>
        <h1 className="mt-5 font-display text-4xl leading-[1.15] font-medium text-balance text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[17px] text-white/65">{children}</p>
      </div>
    </section>
  );
}
