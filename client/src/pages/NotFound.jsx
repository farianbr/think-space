import { Link } from "react-router-dom";
import { Compass } from "../lib/icons";
import { Button } from "../components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-hairline bg-surface text-faint shadow-soft">
        <Compass className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="text-sm font-medium text-muted">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        This space doesn't exist
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        The page you're looking for may have been moved, archived, or never existed.
      </p>
      <div className="mt-6 flex gap-2">
        <Button as={Link} to="/dashboard">
          Back to dashboard
        </Button>
        <Button as={Link} to="/" variant="secondary">
          Go home
        </Button>
      </div>
    </div>
  );
}
