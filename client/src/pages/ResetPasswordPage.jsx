import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Lock, ArrowLeft } from "../lib/icons";
import AuthShell from "../components/auth/AuthShell";
import { Button, Input, Field } from "../components/ui";
import { api } from "../lib/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const weak = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e) => {
    e.preventDefault();
    if (weak || mismatch || !password) return;
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated — please sign in");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.error || "Couldn't reset your password. Try again."
      );
      setSubmitting(false);
    }
  };

  // No token in the link → nothing to reset against.
  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="This link is missing or malformed. Request a new one to continue."
        footer={
          <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        }
      >
        <Link
          to="/forgot-password"
          className="flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition hover:opacity-90"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

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
