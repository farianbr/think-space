import Stripe from "stripe";

// Lazily configured Stripe client. Null when STRIPE_SECRET_KEY is unset, so the
// app boots fine without billing configured — endpoints then return 503.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const isStripeConfigured = () => !!stripe;

// Paid plan → Stripe Price id (from the dashboard). Free has no price.
export const PLAN_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
};

/** Resolve the Stripe Price id for a plan key, or null if unknown/unconfigured. */
export function priceForPlan(plan) {
  return PLAN_PRICES[plan] || null;
}

/** Reverse lookup: which plan a Stripe Price id maps to (defaults to "free"). */
export function planForPrice(priceId) {
  for (const [plan, id] of Object.entries(PLAN_PRICES)) {
    if (id && id === priceId) return plan;
  }
  return "free";
}
