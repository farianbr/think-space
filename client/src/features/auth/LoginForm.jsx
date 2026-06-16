import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail, Lock, ShieldCheck, ArrowLeft } from "../../lib/icons";
import { useAuth } from "../../contexts/authContext";
import { Button, Input, Field } from "../../components/ui";

export default function LoginForm({ onSuccess, isDemo }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState("credentials"); // "credentials" | "2fa"
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setEmail("demo@thinkspace.dev");
      setPassword("demo1234");
    } else {
      setEmail("");
      setPassword("");
    }
    setStage("credentials");
    setCode("");
    setUseRecovery(false);
  }, [isDemo]);

  const { login } = useAuth();

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (payload) => login(payload),
    onSuccess: (data) => {
      if (data?.twoFactorRequired) {
        setStage("2fa");
        return;
      }
      onSuccess?.(data.user || data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stage === "2fa") {
      mutate({ email, password, code });
    } else {
      mutate({ email, password });
    }
  };

  const backToCredentials = () => {
    setStage("credentials");
    setCode("");
    setUseRecovery(false);
    reset();
  };

  const toggleRecovery = () => {
    setUseRecovery((v) => !v);
    setCode("");
    reset();
  };

  // A TOTP code is exactly 6 digits; a recovery code is the 10-char "xxxxx-xxxxx".
  const codeReady = useRecovery
    ? code.replace(/[^a-z0-9]/gi, "").length >= 10
    : code.length === 6;

  const errorMessage = error?.response?.data?.error || "Login failed";

  if (stage === "2fa") {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Two-factor verification</h2>
            <p className="text-sm text-muted">
              {useRecovery
                ? "Enter one of your saved recovery codes."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>
        </div>

        {useRecovery ? (
          <Field label="Recovery code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase().slice(0, 11))}
              autoComplete="one-time-code"
              placeholder="xxxxx-xxxxx"
              className="text-center font-mono tracking-[0.2em]"
              autoFocus
            />
          </Field>
        ) : (
          <Field label="Verification code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="text-center tracking-[0.4em]"
              autoFocus
            />
          </Field>
        )}

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errorMessage}</p>
        )}

        <Button type="submit" size="lg" loading={isPending} disabled={!codeReady} className="justify-center">
          Verify & sign in
        </Button>
        <button
          type="button"
          onClick={toggleRecovery}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {useRecovery ? "Use your authenticator app instead" : "Can't access your app? Use a recovery code"}
        </button>
        <button
          type="button"
          onClick={backToCredentials}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Email">
        <Input
          icon={Mail}
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password">
        <Input
          icon={Lock}
          type="password"
          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="-mt-1 flex justify-end">
        <Link to="/forgot-password" className="text-sm font-medium text-muted hover:text-ink">
          Forgot password?
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errorMessage}</p>
      )}

      <Button type="submit" size="lg" loading={isPending} className="justify-center">
        Sign in
      </Button>
    </form>
  );
}
