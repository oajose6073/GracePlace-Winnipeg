import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { ScrollToHash } from "./ScrollToHash";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-base-100 text-base-content">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-300 focus:rounded-field focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-content"
      >
        Skip to content
      </a>
      <ScrollToHash />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
