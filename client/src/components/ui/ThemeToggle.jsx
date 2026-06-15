import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/themeContext";
import { cn } from "../../lib/cn";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

/**
 * Three-way theme switch (light / dark / system). Compact segmented pill.
 */
export default function ThemeToggle({ className, size = "md" }) {
  const { theme, setTheme } = useTheme();
  const dim = size === "sm" ? "size-6 [&_svg]:size-3.5" : "size-7 [&_svg]:size-4";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-hairline bg-sunken p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-colors duration-150",
              dim,
              active
                ? "bg-surface text-ink shadow-soft"
                : "text-faint hover:text-muted"
            )}
          >
            <Icon strokeWidth={2} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
