import { useNavigate, Link } from "react-router-dom";
import RegisterForm from "../features/auth/RegisterForm";
import AuthShell from "../components/auth/AuthShell";

export default function RegisterPage() {
  const navigate = useNavigate();

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
      <RegisterForm onSuccess={() => navigate("/dashboard", { replace: true })} />
    </AuthShell>
  );
}
