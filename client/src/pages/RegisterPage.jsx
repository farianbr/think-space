import { useLocation, useNavigate, Link } from "react-router-dom";
import RegisterForm from "../features/auth/RegisterForm";
import AuthShell from "../components/auth/AuthShell";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Honor a post-auth redirect (e.g. coming from an invite link) and prefill the
  // invited email when provided.
  const from = location.state?.from?.pathname || "/dashboard";
  const initialEmail = location.state?.email || "";

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start collaborating in a calmer, more focused space."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm
        initialEmail={initialEmail}
        onSuccess={() => navigate(from, { replace: true })}
      />
    </AuthShell>
  );
}
