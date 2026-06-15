import { createContext, useContext } from "react";

/**
 * Theme context value:
 *   theme:      "light" | "dark" | "system"  (user preference)
 *   resolved:   "light" | "dark"             (effective theme after system resolution)
 *   setTheme(next)
 *   cycleTheme()  light -> dark -> system -> light
 */
export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
