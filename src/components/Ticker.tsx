import { tickerItems } from "../data/site";

/** The track holds the list twice so the -50% scroll loops seamlessly. */
export function Ticker() {
  return (
    <div
      aria-hidden="true"
      className="relative z-3 overflow-hidden border-y border-primary/15 bg-neutral"
    >
      <div className="flex w-max animate-ticker">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {tickerItems.map((item) => (
              <span
                key={item}
                className="flex items-center px-7 py-3 text-xs font-medium tracking-[0.14em] text-primary uppercase"
              >
                {item}
                <span className="ml-7 text-primary/40">&#10038;</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
