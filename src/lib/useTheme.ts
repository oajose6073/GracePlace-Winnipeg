import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gp-theme";

export type ThemeMode = "light" | "dark";

const DAISY_THEME: Record<ThemeMode, string> = {
  light: "graceplace",
  dark: "graceplacedark",
};

/** Reads the theme the pre-paint script in index.html already applied, so the
 *  first React render agrees with what is on screen. */
function currentMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === DAISY_THEME.dark
    ? "dark"
    : "light";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(currentMode);

  const apply = useCallback((next: ThemeMode) => {
    setMode(next);
    document.documentElement.setAttribute("data-theme", DAISY_THEME[next]);
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = currentMode() === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private browsing — the theme still applies for this session */
    }
  }, [apply]);

  // Stay in sync if the theme is changed in another tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        apply(event.newValue === "dark" ? "dark" : "light");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [apply]);

  return { mode, toggle };
}
