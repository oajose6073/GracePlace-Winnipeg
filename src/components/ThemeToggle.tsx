import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/useTheme";

/**
 * Lives in the always-dark nav bar, so its own colours stay fixed across
 * themes — only the page content it controls changes.
 */
export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="relative h-[30px] w-14 shrink-0 cursor-pointer rounded-full border border-white/15 bg-white/8 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-px flex w-[26px] items-center justify-center transition-colors ${
          isDark ? "text-white/40" : "text-primary"
        }`}
      >
        <Sun className="size-3.5" strokeWidth={2} />
      </span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-px flex w-[26px] items-center justify-center transition-colors ${
          isDark ? "text-primary" : "text-white/40"
        }`}
      >
        <Moon className="size-3.5" strokeWidth={2} />
      </span>
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-250 motion-reduce:transition-none ${
          isDark ? "translate-x-[26px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
