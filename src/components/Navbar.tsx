import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { church, navLinks } from "../data/site";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [open, setOpen] = useState(false);

  // Every link closes the menu on click, which also covers a hash link to a
  // section of the page we are already on (that navigation does not unmount
  // the nav, so there is nothing else to react to).
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-200 border-b border-white/6 bg-neutral text-neutral-content">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 rounded-box focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <img
            src={church.logo}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full mix-blend-screen"
          />
          <span className="leading-none">
            <span className="block font-display text-xl font-semibold text-white">
              {church.name}
            </span>
            <span className="mt-0.5 block text-[10px] tracking-[0.12em] text-primary uppercase">
              {church.city}
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="group relative text-sm text-white/75 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {link.label}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-primary transition-transform duration-250 group-hover:origin-left group-hover:scale-x-100 motion-reduce:transition-none"
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link to="/give" className="btn btn-primary btn-sm hidden h-9 px-6 sm:inline-flex">
            Give
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          >
            <span
              aria-hidden="true"
              className={`h-[3px] w-6 rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none ${
                open ? "translate-y-[9px] rotate-45" : ""
              }`}
            />
            <span
              aria-hidden="true"
              className={`h-[3px] w-6 rounded-full bg-white transition-opacity duration-300 motion-reduce:transition-none ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              aria-hidden="true"
              className={`h-[3px] w-6 rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none ${
                open ? "-translate-y-[9px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-white/8 bg-neutral lg:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col px-5 py-3 sm:px-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={close}
              className="border-b border-white/6 py-3 text-sm text-white/80 last:border-0 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link to="/give" onClick={close} className="btn btn-primary btn-sm mt-4 mb-1 h-10 sm:hidden">
            Give
          </Link>
        </nav>
      </div>
    </header>
  );
}
