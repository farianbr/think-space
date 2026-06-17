import { Link } from "react-router-dom";
import { Sparkles, Users, Zap, MessageSquare } from "../../lib/icons";
import ThemeToggle from "../ui/ThemeToggle";

const HIGHLIGHTS = [
  { icon: Zap, title: "Real-time canvas", text: "See edits, cursors and presence the instant they happen." },
  { icon: Users, title: "Built for teams", text: "Invite collaborators with the right level of access." },
  { icon: MessageSquare, title: "Think out loud", text: "Sticky notes, mind maps and voice — soon." },
];

/**
 * Split auth layout: an editorial brand panel on the left (desktop) and the
 * form on the right. Calm, premium, no gradients.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-hairline bg-surface p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-ink-contrast">
            <Sparkles className="size-[18px]" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">Think Space</span>
        </Link>

        <div className="max-w-sm">
          <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">
            A calm, shared space for your team's best thinking.
          </h2>
          <div className="mt-10 space-y-6">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-hairline bg-canvas text-ink">
                  <h.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-faint">© {new Date().getFullYear()} Think Space</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-ink-contrast">
              <Sparkles className="size-4" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Think Space</span>
          </Link>
          <ThemeToggle size="sm" />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
