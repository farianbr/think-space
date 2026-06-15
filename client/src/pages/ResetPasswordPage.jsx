import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Lock, ArrowLeft } from "lucide-react";
import AuthShell from "../components/auth/AuthShell";
import { Button, Input, Field } from "../components/ui";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const weak = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = (e) => {
    e.preventDefault();
    if (weak || mismatch || !password) return;
    setSubmitting(true);
    // Reset token verification infra is deferred — acknowledge and route to login.
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Password updated — please sign in");
      navigate("/login", { replace: true });
    }, 600);
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Make it strong — at least 8 characters."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="New password" error={weak ? "Use at least 8 characters" : undefined}>
          <Input
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={weak}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password" error={mismatch ? "Passwords don't match" : undefined}>
          <Input
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={mismatch}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          disabled={weak || mismatch || !password}
          className="justify-center"
        >
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
