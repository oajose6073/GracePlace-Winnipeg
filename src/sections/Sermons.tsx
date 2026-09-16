import { Play } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { YouTubeIcon } from "../components/SocialIcons";
import { SectionHeading } from "../components/SectionHeading";
import { socials } from "../data/site";
import { useSermons } from "../lib/useSermons";

const channelUrl = socials.find((s) => s.icon === "youtube")!.href;

export function Sermons() {
  const { status, sermons } = useSermons();

  return (
    <section id="sermons" className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            label="Sermons"
            title="Latest Sermons"
            sub="Dive into our recent teachings and grow in faith."
            centered
          />
        </Reveal>

        {status === "loading" && (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="card border border-base-300 bg-base-200">
                <div className="skeleton aspect-video rounded-b-none" />
                <div className="card-body gap-3">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {status === "ready" && (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((sermon, index) => (
              <Reveal as="li" key={sermon.id} delay={index * 70} className="h-full">
                <a
                  href={sermon.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group card h-full overflow-hidden border border-base-300 bg-base-200 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
                >
                  <figure className="relative aspect-video overflow-hidden bg-neutral">
                    <img
                      src={sermon.thumbnail}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-neutral/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none">
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-content">
                        <Play className="size-6 translate-x-0.5 fill-current" strokeWidth={0} />
                      </span>
                    </span>
                  </figure>
                  <div className="card-body gap-1.5 p-5">
                    <p className="text-[11px] tracking-[0.12em] text-primary uppercase">Sermon</p>
                    <h3 className="line-clamp-2 font-display text-xl leading-snug font-medium text-ink">
                      {sermon.title}
                    </h3>
                    <p className="text-sm text-base-content/55">{sermon.date}</p>
                  </div>
                </a>
              </Reveal>
            ))}
          </ul>
        )}

        {status === "unavailable" && (
          <Reveal className="mt-12">
            <div className="card mx-auto max-w-xl border border-base-300 bg-base-200 text-center">
              <div className="card-body items-center gap-3 p-10">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <YouTubeIcon className="size-6" />
                </span>
                <h3 className="font-display text-2xl font-medium text-ink">
                  Watch every sermon on YouTube
                </h3>
                <p className="max-w-sm text-[15px] text-base-content/65">
                  Our full library of teachings lives on our channel, with new messages posted
                  after each service.
                </p>
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary mt-2 h-11 px-7"
                >
                  Open our channel
                </a>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
