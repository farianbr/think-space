import { prisma } from "../prismaClient.js";
import {
  stripe,
  isStripeConfigured,
  priceForPlan,
  planForPrice,
} from "../lib/stripe.js";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://thinkspace-client.onrender.com"
    : "http://localhost:5173");

const notConfigured = (res) =>
  res.status(503).json({ message: "Billing is not configured on this server." });

/** GET /api/billing — the current user's plan + subscription state. */
export async function getBillingStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      plan: user.plan || "free",
      subscriptionStatus: user.subscriptionStatus || null,
      currentPeriodEnd: user.currentPeriodEnd || null,
      hasCustomer: !!user.stripeCustomerId,
      configured: isStripeConfigured(),
    });
  } catch (err) {
    console.error("getBillingStatus error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/** Find or create the Stripe customer for a user, persisting the id. */
async function ensureCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** POST /api/billing/checkout { plan } — start a Stripe Checkout session. */
export async function createCheckoutSession(req, res) {
  if (!isStripeConfigured()) return notConfigured(res);
  try {
    const { plan } = req.body || {};
    const price = priceForPlan(plan);
    if (!price)
      return res.status(400).json({ message: "Unknown or unconfigured plan" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const customerId = await ensureCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${FRONTEND_URL}/settings?billing=success`,
      cancel_url: `${FRONTEND_URL}/settings?billing=cancelled`,
      metadata: { userId: user.id, plan },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createCheckoutSession error", err);
    return res.status(500).json({ message: "Could not start checkout" });
  }
}

/** POST /api/billing/portal — open the Stripe customer billing portal. */
export async function createPortalSession(req, res) {
  if (!isStripeConfigured()) return notConfigured(res);
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeCustomerId)
      return res.status(400).json({ message: "No billing account yet" });

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${FRONTEND_URL}/settings`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createPortalSession error", err);
    return res.status(500).json({ message: "Could not open billing portal" });
  }
}

/** Apply a Stripe subscription object to the matching user's plan fields. */
async function applySubscription(subscription) {
  const customerId = subscription.customer;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const plan = active ? planForPrice(priceId) : "free";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    },
  });
}

/**
 * POST /api/billing/webhook — Stripe webhook receiver. Mounted with a raw body
 * parser (see server.js) so the signature can be verified.
 */
export async function handleStripeWebhook(req, res) {
  if (!isStripeConfigured()) return notConfigured(res);

  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature error", err?.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling error", err);
    // Still 200 so Stripe doesn't retry a poison event forever.
  }

  return res.json({ received: true });
}
