import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  Shield,
  Copy,
  Check,
  KeyRound,
  Download,
  AlertTriangle,
} from "../../lib/icons";

import { useAuth } from "../../contexts/authContext";
import {
  useSetup2FA,
  useEnable2FA,
  useDisable2FA,
  useRegenerateRecoveryCodes,
} from "../../hooks/twofactor";
import { Button, Card, Modal, Input, Field, Badge } from "../ui";

/** Read-only grid of recovery codes with copy-all and download actions. */
function RecoveryCodesPanel({ codes }) {
  const [copied, setCopied] = useState(false);

  const asText = codes.join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(asText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const download = () => {
    const blob = new Blob(
      [`Think Space â€” two-factor recovery codes\n\n${asText}\n`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "think-space-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-hairline bg-sunken p-3">
        {codes.map((c) => (
          <span
            key={c}
            className="text-center font-mono text-sm tracking-wide text-ink-soft"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copyAll} className="flex-1">
          {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={download} className="flex-1">
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}

function EnableModal({ open, onClose, setup }) {
  const enable = useEnable2FA();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  const reset = () => {
    setCode("");
    setRecoveryCodes(null);
    setCopied(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await enable.mutateAsync(code);
      setRecoveryCodes(data.recoveryCodes || []);
      toast.success("Two-factor authentication enabled");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not enable two-factor");
    }
  };

  const finish = () => {
    onClose();
    reset();
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  // Phase 2 â€” two-factor is on; show the one-time recovery codes.
  if (recoveryCodes) {
    return (
      <Modal open={open} onClose={finish} title="Save your recovery codes" size="md">
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-sm text-ink-soft">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <p>
              Store these somewhere safe. Each code works once if you lose access to your
              authenticator app. They won't be shown again.
            </p>
          </div>
          <RecoveryCodesPanel codes={recoveryCodes} />
          <div className="flex justify-end">
            <Button onClick={finish}>I've saved them</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Phase 1 â€” scan the QR / enter a code to confirm.
  return (
    <Modal open={open} onClose={finish} title="Set up two-factor authentication" size="md">
      <form onSubmit={submit} className="space-y-5">
        <ol className="space-y-1.5 text-sm text-muted">
          <li>1. Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy).</li>
          <li>2. Enter the 6-digit code it shows to confirm.</li>
        </ol>

        <div className="flex flex-col items-center gap-3">
          {setup?.qrDataUrl && (
            <img
              src={setup.qrDataUrl}
              alt="Two-factor QR code"
              className="size-44 rounded-xl border border-hairline bg-white p-2"
            />
          )}
          <button
            type="button"
            onClick={copySecret}
            className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-sunken px-3 py-1.5 font-mono text-xs tracking-wide text-ink-soft transition-colors hover:border-line"
          >
            {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5 text-faint" />}
            {setup?.secret}
          </button>
          <p className="text-xs text-faint">Can't scan? Enter this key manually.</p>
        </div>

        <Field label="Verification code">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="tracking-[0.3em]"
            autoFocus
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={finish}>
            Cancel
          </Button>
          <Button type="submit" loading={enable.isPending} disabled={code.length !== 6}>
            Enable
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DisableModal({ open, onClose }) {
  const disable = useDisable2FA();
  const [password, setPassword] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await disable.mutateAsync(password);
      toast.success("Two-factor authentication disabled");
      onClose();
      setPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not disable two-factor");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Turn off two-factor authentication" size="sm">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-muted">
          Enter your password to confirm. Your account will rely on your password alone.
        </p>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={disable.isPending} disabled={!password}>
            Disable
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RegenerateModal({ open, onClose }) {
  const regenerate = useRegenerateRecoveryCodes();
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState(null);

  const close = () => {
    onClose();
    setPassword("");
    setCodes(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await regenerate.mutateAsync(password);
      setCodes(data.recoveryCodes || []);
      toast.success("New recovery codes generated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not regenerate codes");
    }
  };

  if (codes) {
    return (
      <Modal open={open} onClose={close} title="Your new recovery codes" size="md">
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-sm text-ink-soft">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <p>Your previous codes no longer work. Save this new set somewhere safe.</p>
          </div>
          <RecoveryCodesPanel codes={codes} />
          <div className="flex justify-end">
            <Button onClick={close}>I've saved them</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="Regenerate recovery codes" size="sm">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-muted">
          This invalidates your current recovery codes and issues a fresh set. Enter your
          password to continue.
        </p>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={regenerate.isPending} disabled={!password}>
            Generate new codes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TwoFactorSettings() {
  const { user } = useAuth();
  const setup = useSetup2FA();
  const enabled = !!user?.twoFactorEnabled;
  const remaining = user?.twoFactorRecoveryCodesRemaining ?? 0;
  const [enableData, setEnableData] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const startSetup = async () => {
    try {
      const data = await setup.mutateAsync();
      setEnableData(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not start setup");
    }
  };

  const lowCodes = remaining > 0 && remaining <= 3;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">Two-factor authentication</h2>
            {enabled ? (
              <Badge variant="positive">
                <ShieldCheck className="size-3" strokeWidth={2} aria-hidden />
                On
              </Badge>
            ) : (
              <Badge variant="outline">Off</Badge>
            )}
          </div>
          <p className="mt-1 max-w-md text-sm text-muted">
            {enabled
              ? "You'll enter a code from your authenticator app each time you sign in."
              : "Add an authenticator app for an extra layer of security at sign-in."}
          </p>
        </div>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-muted sm:flex">
          <Shield className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      </div>

      {enabled && (
        <div className="mt-5 rounded-xl border border-hairline bg-sunken/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
                <KeyRound className="size-4.5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Recovery codes</p>
                <p className="mt-0.5 text-sm text-muted">
                  {remaining > 0
                    ? `${remaining} unused ${remaining === 1 ? "code" : "codes"} remaining.`
                    : "No recovery codes left â€” generate a new set."}
                </p>
                {(lowCodes || remaining === 0) && (
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                      remaining === 0 ? "text-danger" : "text-accent"
                    }`}
                  >
                    <AlertTriangle className="size-3" strokeWidth={2} aria-hidden />
                    {remaining === 0 ? "You can be locked out without codes." : "Running low â€” consider regenerating."}
                  </p>
                )}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setRegenerating(true)}>
              Regenerate
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5">
        {enabled ? (
          <Button variant="secondary" onClick={() => setDisabling(true)}>
            Turn off
          </Button>
        ) : (
          <Button onClick={startSetup} loading={setup.isPending}>
            Enable
          </Button>
        )}
      </div>

      <EnableModal
        open={!!enableData}
        onClose={() => setEnableData(null)}
        setup={enableData || {}}
      />
      <DisableModal open={disabling} onClose={() => setDisabling(false)} />
      <RegenerateModal open={regenerating} onClose={() => setRegenerating(false)} />
    </Card>
  );
}
