import { useState } from "react";
import { toast } from "react-hot-toast";
import { Mail, Link2, Check, ChevronDown, UserMinus } from "lucide-react";
import { Modal, Button, Input, Avatar, DropdownMenu, IconButton, Badge } from "../ui";
import {
  useBoardMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveBoardMember,
} from "../../hooks/members";
import { useAuth } from "../../contexts/authContext";
import { ROLES, ASSIGNABLE_ROLES, roleMeta } from "../../lib/roles";
import { displayName } from "../../lib/format";
import { cn } from "../../lib/cn";

function RolePicker({ value, onChange, disabled }) {
  const meta = roleMeta(value);
  if (disabled) {
    return <span className="text-xs font-medium text-muted">{meta.label}</span>;
  }
  return (
    <DropdownMenu
      align="end"
      width="min-w-52"
      trigger={
        <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-ink">
          {meta.label}
          <ChevronDown className="size-3.5" />
        </button>
      }
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <DropdownMenu.Item key={r.value} icon={r.icon} onSelect={() => onChange(r.value)}>
          <span className="flex flex-col">
            <span>{r.label}</span>
            <span className="text-[11px] font-normal text-faint">{r.description}</span>
          </span>
        </DropdownMenu.Item>
      ))}
    </DropdownMenu>
  );
}

export default function ShareModal({ open, onClose, boardId, board }) {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const invite = useInviteMember(boardId);
  const updateRole = useUpdateMemberRole(boardId);
  const removeMember = useRemoveBoardMember(boardId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [copied, setCopied] = useState(false);

  const ownerId = board?.ownerId;
  const isOwner = user?.id === ownerId;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === ownerId) return -1;
    if (b.userId === ownerId) return 1;
    return (a.user?.name || a.user?.email || "").localeCompare(b.user?.name || b.user?.email || "");
  });

  const submitInvite = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return toast.error("Enter an email address");
    try {
      await invite.mutateAsync({ email: value, role });
      toast.success("Invitation sent");
      setEmail("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not invite");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share board" size="lg" description={board?.title}>
      <div className="flex flex-col gap-6">
        {/* Invite by email */}
        {isOwner && (
          <form onSubmit={submitInvite} className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Invite by email…"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu
                align="end"
                trigger={
                  <Button variant="secondary" type="button" iconRight={ChevronDown}>
                    {roleMeta(role).label}
                  </Button>
                }
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <DropdownMenu.Item key={r.value} icon={r.icon} onSelect={() => setRole(r.value)}>
                    {r.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu>
              <Button type="submit" loading={invite.isPending}>
                Invite
              </Button>
            </div>
          </form>
        )}

        {/* Members */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
            People with access
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {isLoading ? (
              <p className="py-4 text-sm text-muted">Loading members…</p>
            ) : (
              sortedMembers.map((m) => {
                const isOwnerRow = m.userId === ownerId;
                const isSelf = m.userId === user?.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sunken"
                  >
                    <Avatar user={m.user} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {displayName(m.user)}
                        </span>
                        {isSelf && <Badge variant="neutral">You</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted">{m.user?.email}</p>
                    </div>
                    <RolePicker
                      value={isOwnerRow ? "owner" : m.role}
                      disabled={!isOwner || isOwnerRow}
                      onChange={(r) =>
                        updateRole.mutate(
                          { userId: m.userId, role: r },
                          { onError: () => toast.error("Couldn't update role") }
                        )
                      }
                    />
                    {isOwner && !isOwnerRow && (
                      <IconButton
                        icon={UserMinus}
                        label="Remove member"
                        size="sm"
                        onClick={() =>
                          removeMember.mutate(m.userId, {
                            onSuccess: () => toast.success("Member removed"),
                            onError: () => toast.error("Couldn't remove member"),
                          })
                        }
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Copy link */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted">
              <Link2 className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Board link</p>
              <p className="truncate text-xs text-muted">
                Only people added above can open it.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={copied ? Check : Link2}
            onClick={copyLink}
            className={cn(copied && "text-positive")}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-hairline pt-4 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-center gap-2 text-xs text-muted">
              <r.icon className="size-3.5 shrink-0 text-faint" strokeWidth={2} aria-hidden />
              <span className="font-medium text-ink-soft">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
