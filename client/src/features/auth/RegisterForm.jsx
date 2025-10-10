import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/authContext";

export default function RegisterForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const { register } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, name, password }) => register({ email, name, password }),
    onSuccess: (data) => {
      onSuccess?.(data.user || data);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutate({ email, name, password });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />
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
        autoComplete="new-password"
      />
      {error && (
        <div className="text-sm text-red-600">
          {error?.response?.data?.error || "Register failed"}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
