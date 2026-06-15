import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

/** Current user's plan + subscription state. */
export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: async () => (await api.get("/billing")).data,
    staleTime: 1000 * 30,
  });
}

/** Start a Stripe Checkout session for a plan; resolves to { url }. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (plan) => (await api.post("/billing/checkout", { plan })).data,
  });
}

/** Open the Stripe customer billing portal; resolves to { url }. */
export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => (await api.post("/billing/portal")).data,
  });
}
