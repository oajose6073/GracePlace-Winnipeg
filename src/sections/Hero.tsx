import { Link } from "react-router-dom";
import { church, heroSlides, services } from "../data/site";
import { useSlideshow } from "../lib/useSlideshow";

export function Hero() {
  const active = useSlideshow(heroSlides.length);

  return (
    <section
      id="hero"
      className="relative flex min-h-150 flex-col items-center justify-center overflow-hidden px-5 pt-24 pb-0 text-center sm:px-8"
      style={{ height: "100svh" }}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {heroSlides.map((src, index) => (
          <div key={src} className="gp-slide" data-active={index === active}>
            <img
              src={src}
              alt=""
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 z-1 bg-[radial-gradient(ellipse_60%_50%_at_85%_15%,rgba(221,161,59,0.20),transparent_60%),linear-gradient(180deg,rgba(18,12,46,0.70)_0%,rgba(36,28,74,0.64)_55%,rgba(18,12,46,0.76)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute top-[22%] left-[12%] z-1 size-3.5 animate-orb rounded-full bg-[radial-gradient(circle,#dda13b_0%,transparent_70%)] opacity-70 blur-[2px]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[65%] right-[14%] z-1 size-5.5 animate-orb rounded-full bg-[radial-gradient(circle,#dda13b_0%,transparent_70%)] opacity-50 blur-[2px] [animation-delay:1.2s] [animation-duration:8s]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[38%] right-[26%] z-1 size-2.5 animate-orb rounded-full bg-[radial-gradient(circle,#f5e6c8_0%,transparent_70%)] opacity-60 blur-[2px] [animation-delay:0.6s] [animation-duration:5s]"
      />

      <div className="relative z-2 flex flex-1 flex-col items-center justify-center">
        <span className="inline-block rounded-full border border-primary/35 bg-primary/12 px-4 py-1.5 text-[11px] tracking-[0.12em] text-primary uppercase">
          A church family in {church.city}
        </span>

        <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.12] font-medium text-balance text-white">
          Welcome to <em className="text-primary italic">{church.name}</em> {church.city}
        </h1>

        <p className="mt-5 max-w-md text-[17px] text-white/65">{church.tagline}</p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/#contact" className="btn btn-primary h-12 px-8 text-[15px]">
            Join Us
          </Link>
          <Link
            to="/#anthem"
            className="btn h-12 border-white/35 bg-transparent px-8 text-[15px] text-white hover:border-white/70 hover:bg-white/8"
          >
            Learn More
          </Link>
        </div>
      </div>

      <div className="relative z-2 w-full border-t border-white/8 bg-white/5 px-5 py-5 backdrop-blur-sm">
        <dl className="flex flex-wrap justify-center gap-x-14 gap-y-4">
          {services.map((service) => (
            <div key={service.day} className="text-center">
              <dt className="text-[11px] tracking-[0.1em] text-primary uppercase">{service.day}</dt>
              <dd className="mt-0.5 text-base font-medium text-white">{service.time}</dd>
              <dd className="text-xs text-white/45">{service.type}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
