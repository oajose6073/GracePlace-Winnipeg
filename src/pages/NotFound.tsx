import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found — GracePlace Winnipeg";
  }, []);

  return (
    <section className="flex min-h-[60svh] flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
      <p className="text-[11px] tracking-[0.14em] text-primary uppercase">404</p>
      <h1 className="mt-3 font-display text-4xl font-medium text-balance text-ink sm:text-5xl">
        We could not find that page
      </h1>
      <p className="mt-4 max-w-md text-[17px] text-base-content/65">
        The link may be out of date. Everything on the site is one step away from the home page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary h-12 px-7">
          Back to home
        </Link>
        <Link to="/#contact" className="btn h-12 border-base-300 bg-base-200 px-7">
          Contact us
        </Link>
      </div>
    </section>
  );
}
