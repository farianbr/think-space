import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContext";

const STORAGE_KEY = "ts:theme";
const THEMES = ["light", "dark", "system"];

function getStoredTheme() {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored) ? stored : "system";
}

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTheme(theme) {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/**
 * Owns theme preference, persists it, reacts to OS changes when on "system",
 * and toggles the `.dark` class on <html>. The inline script in index.html
 * applies the initial class before paint; this keeps it in sync afterwards.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(getStoredTheme()));

  // Apply the resolved theme to <html> and keep the <meta theme-color> honest.
  useEffect(() => {
    const next = resolveTheme(theme);
    setResolved(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
  }, [theme]);

  // When following the system, repaint as the OS preference changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemPrefersDark() ? "dark" : "light";
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence errors (private mode, etc.) */
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolved, setTheme, cycleTheme }),
    [theme, resolved, setTheme, cycleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
