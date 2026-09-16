import { BookOpen, Heart, Wind } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { SectionHeading } from "../components/SectionHeading";
import { anthemPhotos, values } from "../data/site";

const valueIcons = { heart: Heart, book: BookOpen, wind: Wind } as const;

export function Anthem() {
  return (
    <section id="anthem" className="bg-base-200 px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal className="group relative order-2 aspect-4/3 lg:order-1">
          <div
            aria-hidden="true"
            className="absolute top-[8%] left-[14%] size-24 rounded-full bg-[radial-gradient(circle,rgba(221,161,59,0.35)_0%,transparent_70%)]"
          />
          <img
            src={anthemPhotos.back}
            alt="GracePlace members gathered together during a service"
            loading="lazy"
            className="absolute top-0 right-0 z-1 h-[78%] w-[72%] rotate-4 rounded-2xl border-6 border-base-100 object-cover shadow-[0_16px_40px_rgba(18,12,46,0.22)] transition-transform duration-350 group-hover:-translate-y-1 group-hover:rotate-6 motion-reduce:transition-none"
          />
          <img
            src={anthemPhotos.front}
            alt="A GracePlace member leading worship"
            loading="lazy"
            className="absolute bottom-0 left-0 z-2 h-[62%] w-[62%] -rotate-5 rounded-2xl border-6 border-base-100 object-cover shadow-[0_16px_40px_rgba(18,12,46,0.22)] transition-transform duration-350 group-hover:-translate-y-1 group-hover:-rotate-7 motion-reduce:transition-none"
          />
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <SectionHeading
            label="GracePlace Anthem"
            title="This is GracePlace"
            sub="A vibrant church family rooted in faith, committed to knowing God, growing together, and serving one another."
          />

          <ul className="mt-8 space-y-5">
            {values.map((value) => {
              const Icon = valueIcons[value.icon];
              return (
                <li key={value.title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span>
                    <strong className="block font-medium text-ink">{value.title}</strong>
                    <span className="text-[15px] text-base-content/65">{value.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
