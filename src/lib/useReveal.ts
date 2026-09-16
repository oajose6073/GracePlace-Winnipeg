import { useEffect, useRef, useState } from "react";

/** Visitors who ask for reduced motion, and browsers without
 *  IntersectionObserver, skip the animation and start fully visible. */
function revealsImmediately() {
  if (typeof IntersectionObserver === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fades and lifts an element into place the first time it scrolls into view.
 * Returns a ref to attach and the visibility flag; once revealed, the element
 * stops being observed so it never animates twice.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(revealsImmediately);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Fire a little before the element is fully on screen, matching the
      // 92%-of-viewport cutoff the original site used.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}
