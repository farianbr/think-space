import { Link } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Users,
  StickyNote,
  Network,
  Mic,
  ArrowRight,
} from "../lib/icons";
import { useAuth } from "../contexts/authContext";
import { Button, ThemeToggle } from "../components/ui";

const FEATURES = [
  { icon: Zap, title: "Real-time canvas", text: "Edits, cursors and presence sync the instant they happen â€” no refresh, no friction." },
  { icon: StickyNote, title: "Sticky thinking", text: "Drop notes, arrange ideas, and watch structure emerge on an infinite canvas." },
  { icon: Users, title: "Made for teams", text: "Invite collaborators with precise roles â€” admin, editor, commenter or viewer." },
  { icon: Network, title: "Templates that start you", text: "Brainstorms, roadmaps, retros and mind maps, ready in a single click." },
  { icon: Mic, title: "Voice, soon", text: "Talk it through without leaving the board. Elegant, lightweight voice rooms." },
  { icon: Sparkles, title: "Calm by design", text: "A quiet, premium interface that gets out of the way of your best ideas." },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-ink-contrast">
              <Sparkles className="size-4" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Think Space</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            {user ? (
              <Button as={Link} to="/dashboard" size="sm" iconRight={ArrowRight}>
                Open app
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </Button>
                <Button as={Link} to="/register" size="sm">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          Collaborative visual workspace
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Where your team's ideas come together
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">
          Think Space is a calm, real-time canvas for brainstorming, diagramming and
          planning â€” built for teams who care about how their tools feel.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button as={Link} to={user ? "/dashboard" : "/register"} size="lg" iconRight={ArrowRight}>
            {user ? "Go to your boards" : "Start for free"}
          </Button>
          {!user && (
            <Button as={Link} to="/login" state={{ demo: true }} variant="secondary" size="lg">
              Try the demo
            </Button>
          )}
        </div>

        {/* Canvas preview motif */}
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-pop">
            <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-3">
              <span className="size-2.5 rounded-full bg-line" />
              <span className="size-2.5 rounded-full bg-line" />
              <span className="size-2.5 rounded-full bg-line" />
            </div>
            <div className="relative h-60 bg-sunken p-6">
              {[
                { c: "#fde68a", l: "8%", t: "14%", r: "-6deg" },
                { c: "#bae6fd", l: "38%", t: "30%", r: "3deg" },
                { c: "#bbf7d0", l: "64%", t: "12%", r: "-3deg" },
                { c: "#fbcfe8", l: "20%", t: "55%", r: "4deg" },
                { c: "#ddd6fe", l: "55%", t: "58%", r: "-2deg" },
              ].map((n, i) => (
                <div
                  key={i}
                  className="absolute size-24 rounded-xl border border-black/5 shadow-card"
                  style={{ left: n.l, top: n.t, backgroundColor: n.c, transform: `rotate(${n.r})` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            Everything you need to think together
          </h2>
          <p className="mt-3 text-muted">Powerful where it counts, quiet everywhere else.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-xl border border-hairline bg-canvas text-ink">
                <f.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-hairline bg-ink px-8 py-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-contrast">
              Bring your next idea to life
            </h2>
            <p className="mx-auto mt-3 max-w-md text-ink-contrast/70">
              Create your first board in seconds. No credit card, no clutter.
            </p>
            <Button
              as={Link}
              to="/register"
              variant="secondary"
              size="lg"
              className="mt-7"
              iconRight={ArrowRight}
            >
              Create your account
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-faint" aria-hidden />
            <span>Think Space</span>
          </div>
          <p>Â© {new Date().getFullYear()} Â· Made by Farian Bin Rahman</p>
        </div>
      </footer>
    </div>
  );
}
