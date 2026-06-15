import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  User,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Users,
  Lock,
} from "lucide-react";

import { useAuth } from "../contexts/authContext";
import { useUpdateProfile } from "../hooks/profile";
import { Avatar, Button, Card, Field, Input, ThemeToggle, Badge } from "../components/ui";
import { cn } from "../lib/cn";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell, soon: true },
  { id: "team", label: "Team", icon: Users, soon: true },
  { id: "security", label: "Security", icon: Shield, soon: true },
  { id: "billing", label: "Billing", icon: CreditCard, soon: true },
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
          {section?.soon && <ComingSoon section={section} />}
        </div>
      </div>
    </div>
  );
}
