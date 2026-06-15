import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Lock, User } from "lucide-react";
import { useAuth } from "../../contexts/authContext";
import { Button, Input, Field } from "../../components/ui";

export default function RegisterForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const { register } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload) => register(payload),
    onSuccess: (data) => onSuccess?.(data.user || data),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({ email, name, password });
  };

  const weak = password.length > 0 && password.length < 8;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input
          icon={User}
          placeholder="Ada Lovelace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
      </Field>
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
      <Field
        label="Password"
        error={weak ? "Use at least 8 characters" : undefined}
        hint={!weak ? "At least 8 characters." : undefined}
      >
        <Input
          icon={Lock}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          invalid={weak}
          required
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error?.response?.data?.error || "Registration failed"}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        disabled={weak}
        className="justify-center"
      >
        Create account
      </Button>
    </form>
  );
}
