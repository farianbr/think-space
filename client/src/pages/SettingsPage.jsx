import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  User,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Users,
  Lock,
  UserPlus,
  AtSign,
  KeyRound,
  Layers,
  ArrowRight,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";

import { useAuth } from "../contexts/authContext";
import { useUpdateProfile, useChangePassword } from "../hooks/profile";
import { usePeople } from "../hooks/people";
import { useBillingStatus, useCheckout, useBillingPortal } from "../hooks/billing";
import { roleMeta } from "../lib/roles";
import { timeAgo } from "../lib/format";
import TwoFactorSettings from "../components/settings/TwoFactorSettings";
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  ThemeToggle,
  Badge,
  Switch,
} from "../components/ui";
import { cn } from "../lib/cn";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function ProfileSection() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");

  const dirty = name !== (user?.name || "") || avatarUrl !== (user?.avatarUrl || "");

  const save = async (e) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save");
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-ink">Profile</h2>
      <p className="mt-1 text-sm text-muted">How you appear across Think Space.</p>

      <div className="mt-6 flex items-center gap-4">
        <Avatar user={{ name, email: user?.email }} src={avatarUrl} size="xl" />
        <div className="text-sm text-muted">
          <p className="font-medium text-ink">{name || user?.email}</p>
          <p>{user?.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 max-w-md space-y-4">
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Email">
          <Input value={user?.email || ""} disabled />
        </Field>
        <Field label="Avatar URL" hint="Paste a link to an image, or leave blank for initials.">
          <Input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <div>
          <Button type="submit" loading={update.isPending} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AppearanceSection() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-ink">Appearance</h2>
      <p className="mt-1 text-sm text-muted">Choose how Think Space looks to you.</p>
      <div className="mt-6 flex items-center justify-between rounded-xl border border-hairline bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-ink">Theme</p>
          <p className="text-xs text-muted">Light, dark, or match your system.</p>
        </div>
        <ThemeToggle />
      </div>
    </Card>
  );
}

const NOTIFICATION_TYPES = [
  {
    key: "invite",
    icon: UserPlus,
    title: "Board invitations",
    description: "When someone adds you to a board.",
  },
  {
    key: "member_added",
    icon: Users,
    title: "New collaborators",
    description: "When someone joins a board you're on.",
  },
  {
    key: "mention",
    icon: AtSign,
    title: "Mentions",
    description: "When someone mentions you in a board.",
  },
];

function NotificationsSection() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const prefs = user?.preferences?.notifications || {};
  // Default on: a type is muted only when explicitly false.
  const isOn = (key) => prefs[key] !== false;
  const [saving, setSaving] = useState(null);

  const toggle = async (key, value) => {
    setSaving(key);
    const nextPrefs = {
      ...(user?.preferences || {}),
      notifications: { ...prefs, [key]: value },
    };
    try {
      await update.mutateAsync({ preferences: nextPrefs });
    } catch {
      toast.error("Could not update preference");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-ink">Notifications</h2>
      <p className="mt-1 text-sm text-muted">
        Choose what shows up in your notification center.
      </p>

      <div className="mt-6 divide-y divide-hairline">
        {NOTIFICATION_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted">
                <Icon className="size-4" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                <p className="text-xs text-muted">{t.description}</p>
              </div>
              <Switch
                checked={isOn(t.key)}
                disabled={saving === t.key}
                onChange={(v) => toggle(t.key, v)}
                label={t.title}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SecuritySection() {
  const changePw = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("New password must be at least 8 characters");
    if (next !== confirm) return toast.error("New passwords don't match");
    try {
      await changePw.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      reset();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update password");
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted" strokeWidth={2} aria-hidden />
          <h2 className="text-base font-semibold text-ink">Change password</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Use at least 8 characters. You'll stay signed in on this device.
        </p>

        <form onSubmit={submit} className="mt-6 max-w-md space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <div>
            <Button
              type="submit"
              loading={changePw.isPending}
              disabled={!current || !next || !confirm}
            >
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <TwoFactorSettings />
    </div>
  );
}

function TeamSection() {
  const { data: people, isLoading } = usePeople();
  const list = people || [];
  const boardCount = new Set(list.flatMap((p) => p.sharedBoards.map((b) => b.id))).size;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Team</h2>
          <p className="mt-1 text-sm text-muted">People you collaborate with across your boards.</p>
        </div>
        <Link
          to="/team"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center py-8 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-hairline bg-sunken text-faint">
            <Users className="size-5" strokeWidth={1.75} />
          </span>
          <p className="max-w-sm text-sm text-muted">
            No collaborators yet. Invite people to a board and they'll appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-6 border-b border-hairline pb-4 text-sm">
            <span className="text-muted">
              <span className="text-lg font-semibold text-ink">{list.length}</span>{" "}
              {list.length === 1 ? "teammate" : "teammates"}
            </span>
            <span className="text-muted">
              <span className="text-lg font-semibold text-ink">{boardCount}</span> shared{" "}
              {boardCount === 1 ? "board" : "boards"}
            </span>
          </div>
          <div className="mt-2 divide-y divide-hairline">
            {list.slice(0, 8).map((p) => {
              const meta = roleMeta(p.topRole);
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <Avatar user={p} src={p.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.name || p.email}</p>
                    <p className="truncate text-xs text-muted">{p.email}</p>
                  </div>
                  <div className="hidden items-center gap-1 text-xs text-faint sm:flex">
                    <Layers className="size-3.5" strokeWidth={2} aria-hidden />
                    {p.sharedCount}
                  </div>
                  <Badge variant={p.topRole === "owner" ? "accent" : "neutral"}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
          {list.length > 8 && (
            <p className="mt-3 text-center text-xs text-faint">
              and {list.length - 8} more — see the full{" "}
              <Link to="/team" className="font-medium text-muted hover:text-ink">
                Team page
              </Link>
            </p>
          )}
        </>
      )}
    </Card>
  );
}

const BILLING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Up to 3 boards", "Real-time collaboration", "Comments & reactions"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8",
    period: "/ month",
    features: ["Unlimited boards", "Voice rooms", "Priority sync", "Board templates"],
  },
  {
    id: "team",
    name: "Team",
    price: "$16",
    period: "/ user / month",
    features: ["Everything in Pro", "Admin roles & RBAC", "Workspace activity", "Centralized billing"],
  },
];

function BillingSection() {
  const { data: billing, isLoading, refetch } = useBillingStatus();
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const currentPlan = billing?.plan || "free";

  // Reflect the redirect back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("billing");
    if (!status) return;
    if (status === "success") {
      toast.success("Subscription updated");
      refetch();
    } else if (status === "cancelled") {
      toast("Checkout cancelled");
    }
    params.delete("billing");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [refetch]);

  const upgrade = async (plan) => {
    try {
      const { url } = await checkout.mutateAsync(plan);
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not start checkout");
    }
  };

  const manage = async () => {
    try {
      const { url } = await portal.mutateAsync();
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not open billing portal");
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Billing & plan</h2>
            <p className="mt-1 text-sm text-muted">
              {isLoading ? (
                "Loading…"
              ) : (
                <>
                  You're on the{" "}
                  <span className="font-medium capitalize text-ink">{currentPlan}</span> plan
                  {billing?.subscriptionStatus && billing.subscriptionStatus !== "active" && (
                    <span className="text-danger"> · {billing.subscriptionStatus}</span>
                  )}
                  {billing?.currentPeriodEnd && currentPlan !== "free" && (
                    <span className="text-faint">
                      {" "}
                      · renews {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                  .
                </>
              )}
            </p>
          </div>
          {billing?.hasCustomer && (
            <Button variant="secondary" size="sm" icon={ExternalLink} onClick={manage} loading={portal.isPending}>
              Manage subscription
            </Button>
          )}
        </div>

        {billing && !billing.configured && (
          <p className="mt-4 rounded-lg border border-hairline bg-sunken px-3 py-2 text-xs text-muted">
            Billing isn't configured on this server yet. Add your Stripe keys to enable upgrades.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPaid = plan.id !== "free";
          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col p-5",
                isCurrent && "ring-2 ring-accent"
              )}
            >
              <div className="flex items-center gap-2">
                {plan.id === "pro" && <Sparkles className="size-4 text-accent" />}
                <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
                {isCurrent && <Badge variant="accent">Current</Badge>}
              </div>
              <p className="mt-2">
                <span className="text-2xl font-semibold text-ink">{plan.price}</span>{" "}
                <span className="text-xs text-muted">{plan.period}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-positive" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Current plan
                  </Button>
                ) : isPaid ? (
                  <Button
                    className="w-full"
                    onClick={() => upgrade(plan.id)}
                    loading={checkout.isPending}
                    disabled={billing && !billing.configured}
                  >
                    {currentPlan === "free" ? "Upgrade" : "Switch"} to {plan.name}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={manage}
                    disabled={!billing?.hasCustomer}
                  >
                    Downgrade
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoon({ section }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-ink">{section.label}</h2>
        <Badge variant="outline">Coming soon</Badge>
      </div>
      <div className="mt-8 flex flex-col items-center justify-center py-10 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-hairline bg-sunken text-faint">
          <Lock className="size-5" strokeWidth={1.75} />
        </span>
        <p className="max-w-sm text-sm text-muted">
          {section.label} settings are on the way. We're polishing this experience
          and it'll land in an upcoming release.
        </p>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState("profile");
  const section = SECTIONS.find((s) => s.id === active);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Settings</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active === s.id ? "bg-sunken text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink"
                )}
              >
                <Icon className="size-4" strokeWidth={2} aria-hidden />
                {s.label}
                {s.soon && (
                  <span className="ml-auto size-1.5 rounded-full bg-faint" aria-hidden />
                )}
              </button>
            );
          })}
        </nav>

        <div>
          {active === "profile" && <ProfileSection />}
          {active === "appearance" && <AppearanceSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "security" && <SecuritySection />}
          {active === "team" && <TeamSection />}
          {active === "billing" && <BillingSection />}
          {section?.soon && <ComingSoon section={section} />}
        </div>
      </div>
    </div>
  );
}
