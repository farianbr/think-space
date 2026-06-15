import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import { Button, Input, Field } from "../../components/ui";

export default function LoginForm({ onSuccess, isDemo }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isDemo) {
      setEmail("demo@thinkspace.dev");
      setPassword("demo1234");
    } else {
      setEmail("");
      setPassword("");
    }
  }, [isDemo]);

  const { login } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }) => login({ email, password }),
    onSuccess: (data) => onSuccess?.(data.user || data),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({ email, password });
  };

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
          placeholder="••••••••"
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
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error?.response?.data?.error || "Login failed"}
        </p>
      )}

      <Button type="submit" size="lg" loading={isPending} className="justify-center">
        Sign in
      </Button>
    </form>
  );
}
