import { useEffect, useRef, useState } from "react";
import { Check, Copy, CreditCard, Globe, Info, Mail } from "lucide-react";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { SectionHeading } from "../components/SectionHeading";
import { church, givingScripture } from "../data/site";

function CopyEmailButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(church.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — select the
      // address instead so it can still be copied by hand.
      const range = document.createRange();
      const node = document.getElementById("give-email-text");
      if (node) {
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="btn mt-4 h-12 w-full justify-between gap-3 border-base-300 bg-base-100 px-5 font-normal"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Mail className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
          <span id="give-email-text" className="truncate">
            {church.email}
          </span>
        </span>
        {copied ? (
          <Check className="size-4 shrink-0 text-success" strokeWidth={2.25} />
        ) : (
          <Copy className="size-4 shrink-0 text-base-content/50" strokeWidth={1.75} />
        )}
      </button>
      <p role="status" aria-live="polite" className="mt-2 h-5 text-sm text-success">
        {copied ? "Copied to clipboard" : ""}
      </p>
    </>
  );
}

export default function Give() {
  useEffect(() => {
    document.title = "Give — GracePlace Winnipeg";
  }, []);

  return (
    <>
      <PageHero
        badge="Generosity"
        title={
          <>
            Give and make an <em className="text-primary italic">impact</em>
          </>
        }
      >
        Your giving supports the ministry of GracePlace and helps us serve our community in
        Winnipeg and beyond.
      </PageHero>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <figure className="rounded-box border-l-2 border-primary bg-base-200 px-7 py-8 sm:px-10">
              <blockquote className="font-display text-2xl leading-snug text-balance text-ink italic sm:text-[28px]">
                {givingScripture.quote}
              </blockquote>
              <figcaption className="mt-4 text-[11px] tracking-[0.14em] text-primary uppercase">
                {givingScripture.reference}
              </figcaption>
            </figure>
          </Reveal>

          <Reveal className="mt-16">
            <SectionHeading
              label="Ways to Give"
              title="Choose how you would like to give"
              centered
            />
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal className="h-full">
              <article className="card h-full border border-base-300 bg-base-200">
                <div className="card-body p-7 sm:p-8">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CreditCard className="size-5.5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-medium text-ink">
                    Interac e-Transfer
                  </h3>
                  <p className="text-[15px] text-base-content/65">
                    Send your donation directly to our church email. Add a note describing your
                    gift so we can record it correctly.
                  </p>
                  <CopyEmailButton />
                </div>
              </article>
            </Reveal>

            <Reveal delay={90} className="h-full">
              <article className="card h-full border border-base-300 bg-base-200">
                <div className="card-body p-7 sm:p-8">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Globe className="size-5.5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-medium text-ink">
                    Credit or debit card
                  </h3>
                  <p className="text-[15px] text-base-content/65">
                    Online card giving is being set up. Until it is ready, e-Transfer is the
                    fastest way to give, or speak with someone on the team at a Sunday service.
                  </p>
                  <p className="mt-4">
                    <span className="badge badge-soft badge-warning rounded-full">Coming soon</span>
                  </p>
                </div>
              </article>
            </Reveal>
          </div>

          <Reveal className="mt-8">
            <div role="note" className="alert alert-soft rounded-box items-start gap-3 text-left">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
              <p className="text-[15px] leading-relaxed">
                <strong className="font-medium">For Interac e-Transfers</strong> — please include a
                description in the notes field (for example Tithe, Offering, or Missions) so we can
                categorize your gift correctly. Thank you for your generosity and faithfulness.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
