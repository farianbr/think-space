import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/authContext";

export default function LoginForm({ onSuccess, isDemo }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isDemo) {
    // Pre-fill demo credentials when isDemo is true
    if (email !== "demo@thinkspace.dev") {
      setEmail("demo@thinkspace.dev");
    }
    if (password !== "demo1234") {
      setPassword("demo1234");
    }
  }
  else {
    // Clear fields when isDemo is false
    if (email !== "") {
      setEmail("");
    }
    if (password !== "") {
      setPassword("");
    }
  }

  const { login } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }) => login({ email, password }),
    onSuccess: (data) => {
      onSuccess?.(data.user || data);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        style={{ fontSize: "16px" }} // Prevent zoom on iOS
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        style={{ fontSize: "16px" }} // Prevent zoom on iOS
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && (
        <div className="text-sm text-red-600">
          {error?.response?.data?.error || "Login failed"}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
