import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/authContext";
import { saveAuth, getToken } from "../lib/auth";

/** Begin TOTP setup — returns { otpauthUrl, qrDataUrl, secret }. */
export function useSetup2FA() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/2fa/setup");
      return res.data;
    },
  });
}

/** Merge a patch into the auth context user and persist it to localStorage. */
function useSyncUser() {
  const { user, setUser } = useAuth();
  return (patch) => {
    const merged = { ...user, ...patch };
    setUser(merged);
    saveAuth({ token: getToken(), user: merged });
  };
}

/** Verify a code and turn 2FA on. Response carries the one-time recovery codes. */
export function useEnable2FA() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: async (code) => {
      const res = await api.post("/auth/2fa/enable", { code });
      return res.data;
    },
    onSuccess: (data) =>
      sync({
        twoFactorEnabled: true,
        twoFactorRecoveryCodesRemaining: data?.recoveryCodesRemaining ?? 0,
      }),
  });
}

/** Turn 2FA off (requires the account password). */
export function useDisable2FA() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: async (password) => {
      const res = await api.post("/auth/2fa/disable", { password });
      return res.data;
    },
    onSuccess: () =>
      sync({ twoFactorEnabled: false, twoFactorRecoveryCodesRemaining: 0 }),
  });
}

/** Replace recovery codes with a fresh set (password-gated). Returns the codes. */
export function useRegenerateRecoveryCodes() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: async (password) => {
      const res = await api.post("/auth/2fa/recovery-codes", { password });
      return res.data;
    },
    onSuccess: (data) =>
      sync({ twoFactorRecoveryCodesRemaining: data?.recoveryCodesRemaining ?? 0 }),
  });
}
