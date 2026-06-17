import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, MailCheck } from "../lib/icons";
import AuthShell from "../components/auth/AuthShell";
import { Button, Input, Field } from "../components/ui";
import { api } from "../lib/api";

/**
 * Password reset request. Posts to the backend which (when the account exists)
 * emails a tokenized reset link. The response is intentionally non-revealing, so
 * we always show the same confirmation regardless of whether the email matched.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch {
      // Swallow errors too — never reveal whether the account exists.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${email}, you'll receive a reset link shortly.`}
        footer={
          <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center rounded-xl border border-hairline bg-surface px-6 py-10 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <MailCheck className="size-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted">
            Didn't get it? Check spam, or{" "}
            <button onClick={() => setSent(false)} className="font-medium text-ink hover:underline">
              try another email
            </button>
            .
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to get back in."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Email">
          <Input
            icon={Mail}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="justify-center">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
