import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import LoginForm from "../features/auth/LoginForm";
import AuthShell from "../components/auth/AuthShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDemo, setIsDemo] = useState(Boolean(location.state?.demo));

  const from = location.state?.from?.pathname || "/dashboard";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-ink hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm onSuccess={() => navigate(from, { replace: true })} isDemo={isDemo} />
      <button
        onClick={() => setIsDemo((d) => !d)}
        className="mt-4 w-full text-center text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {isDemo ? "Clear demo credentials" : "Use a demo account"}
      </button>
    </AuthShell>
  );
}
