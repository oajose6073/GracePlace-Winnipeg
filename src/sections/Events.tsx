import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { SectionHeading } from "../components/SectionHeading";
import { events, services } from "../data/site";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export function Events() {
  return (
    <section id="events" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            label="What's On"
            title="Upcoming Events"
            sub="Stay connected with what is happening at GracePlace."
            centered
          />
        </Reveal>

        {events.length > 0 ? (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <Reveal as="li" key={event.title} delay={index * 70} className="h-full">
                <article className="card h-full border border-base-300 bg-base-200">
                  <div className="card-body gap-2 p-6">
                    <p className="text-[11px] tracking-[0.12em] text-primary uppercase">
                      {formatDate(event.date)}
                    </p>
                    <h3 className="font-display text-2xl leading-snug font-medium text-ink">
                      {event.title}
                    </h3>
                    <p className="text-[15px] text-base-content/65">{event.description}</p>
                    <dl className="mt-2 space-y-1.5 text-sm text-base-content/70">
                      <div className="flex items-center gap-2">
                        <dt className="sr-only">Time</dt>
                        <Clock className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
                        <dd>{event.time}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <dt className="sr-only">Location</dt>
                        <MapPin className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
                        <dd>{event.location}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        ) : (
          <Reveal className="mt-12">
            <div className="card mx-auto max-w-2xl border border-base-300 bg-base-200">
              <div className="card-body items-center gap-4 p-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CalendarDays className="size-6" strokeWidth={1.75} />
                </span>
                <h3 className="font-display text-2xl font-medium text-ink">
                  Nothing extra on the calendar right now
                </h3>
                <p className="max-w-md text-[15px] text-base-content/65">
                  Special events are announced here as they are scheduled. In the meantime, the
                  doors are open every week:
                </p>
                <dl className="mt-1 flex flex-wrap justify-center gap-x-10 gap-y-3">
                  {services.map((service) => (
                    <div key={service.day} className="text-center">
                      <dt className="text-[11px] tracking-[0.1em] text-primary uppercase">
                        {service.day}
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">{service.time}</dd>
                      <dd className="text-xs text-base-content/55">{service.type}</dd>
                    </div>
                  ))}
                </dl>
                <Link to="/#contact" className="btn btn-primary mt-3 h-11 px-7">
                  Plan your visit
                </Link>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
