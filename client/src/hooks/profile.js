import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/authContext";
import { saveAuth, getToken } from "../lib/auth";

/**
 * Update the current user's profile / preferences and keep the auth context
 * (and persisted user) in sync.
 */
export function useUpdateProfile() {
  const { user, setUser } = useAuth();
  return useMutation({
    mutationFn: async (patch) => {
      const res = await api.patch("/auth/me", patch);
      return res.data.user;
    },
    onSuccess: (updated) => {
      const merged = { ...user, ...updated };
      setUser(merged);
      saveAuth({ token: getToken(), user: merged });
    },
  });
}

/** Change the current user's password (verifies the current one server-side). */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/auth/change-password", payload);
      return res.data;
    },
  });
}
