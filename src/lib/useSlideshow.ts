import { useEffect, useState } from "react";

/**
 * Advances through the hero frames on a timer. Visitors who have asked for
 * reduced motion keep the first frame and no timer is ever started.
 */
export function useSlideshow(count: number, intervalMs = 5000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [count, intervalMs]);

  return index;
}
