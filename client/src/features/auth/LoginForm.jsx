import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "./api";
import { saveAuth } from "../../lib/auth";

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("demo@thinkspace.dev");
  const [password, setPassword] = useState("demo1234");

  const { mutate, isPending, error } = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      saveAuth(data); // saves token + user
      onSuccess?.(data.user); 
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutate({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        className="rounded border border-gray-300 px-3 py-2 text-sm"
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
