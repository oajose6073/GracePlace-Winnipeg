import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router does not restore scroll position or honour `#section` links on
 * its own. Navigating to a hash scrolls that section into view; navigating to
 * a new page without one starts at the top.
 */
export function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    // Wait a frame so the destination page has rendered its sections.
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
}
