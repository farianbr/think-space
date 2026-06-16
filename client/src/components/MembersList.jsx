import { useState } from "react";
import { toast } from "react-hot-toast";
import { Crown, UserMinus, Users } from "../lib/icons";

import { useBoardMembers, useRemoveBoardMember } from "../hooks/members";
import { useAuth } from "../contexts/authContext";
import { Avatar, Badge, IconButton, EmptyState, Skeleton, ConfirmDialog } from "./ui";
import { roleMeta, canManageMembersRole } from "../lib/roles";
import { displayName } from "../lib/format";

export default function MembersList({ boardId, boardOwnerId }) {
  const { data: members, isLoading, isError } = useBoardMembers(boardId);
  const removeMutation = useRemoveBoardMember(boardId);
  const { user } = useAuth();
  const isOwner = user?.id === boardOwnerId;
  const selfRole = isOwner ? "owner" : members?.find((m) => m.userId === user?.id)?.role || null;
  const canManage = isOwner || canManageMembersRole(selfRole);
  const [confirming, setConfirming] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-danger">Couldn't load members.</p>;
  }

  if (!members || members.length === 0) {
    return <EmptyState icon={Users} size="sm" title="No members yet" description="Invite collaborators to get started." />;
  }

  const sorted = [...members].sort((a, b) => {
    if (a.userId === boardOwnerId) return -1;
    if (b.userId === boardOwnerId) return 1;
    return (a.user?.name || a.user?.email || "").localeCompare(b.user?.name || b.user?.email || "");
  });

  return (
    <>
      <div className="space-y-0.5">
        {sorted.map((m) => {
          const isOwnerRow = m.userId === boardOwnerId;
          return (
            <div key={m.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
              <Avatar user={m.user} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">{displayName(m.user)}</span>
                  {isOwnerRow && <Crown className="size-3.5 shrink-0 text-accent" />}
                  {m.user?.id === user?.id && <Badge variant="neutral">You</Badge>}
                </div>
                <p className="truncate text-xs text-muted">{m.user?.email}</p>
              </div>
              <span className="text-xs font-medium text-faint">
                {isOwnerRow ? "Owner" : roleMeta(m.role).label}
              </span>
              {canManage && !isOwnerRow && (isOwner || m.role !== "admin") && (
                <IconButton
                  icon={UserMinus}
                  label="Remove member"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => setConfirming(m)}
                />
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() =>
          removeMutation.mutate(confirming.userId, {
            onSuccess: () => {
              toast.success("Member removed");
              setConfirming(null);
            },
            onError: (err) => toast.error(err?.response?.data?.message || "Couldn't remove member"),
          })
        }
        title="Remove member?"
        description={`${displayName(confirming?.user)} will lose access to this board.`}
        confirmLabel="Remove"
        danger
        loading={removeMutation.isPending}
      />
    </>
  );
}
