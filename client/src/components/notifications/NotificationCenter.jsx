import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "../../lib/icons";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsSocket,
} from "../../hooks/notifications";
import { describeNotification } from "../../lib/activityText";
import { timeAgo } from "../../lib/format";
import { IconButton, EmptyState, Skeleton } from "../ui";
import { cn } from "../../lib/cn";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  useNotificationsSocket();

  const notifications = data?.notifications || [];
  const unread = data?.unreadCount || 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onItem = (n) => {
    if (!n.readAt) markOne.mutate(n.id);
    if (n.boardId) {
      setOpen(false);
      navigate(`/board/${n.boardId}`);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        icon={Bell}
        label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className={cn(open && "bg-sunken text-ink")}
      />
      {unread > 0 && (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-contrast">
          {unread > 9 ? "9+" : unread}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-pop animate-pop-in">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-9" rounded="rounded-full" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                size="sm"
                title="You're all caught up"
                description="Invitations and board updates will show up here."
              />
            ) : (
              notifications.map((n) => {
                const d = describeNotification(n);
                const Icon = d.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => onItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken",
                      !n.readAt && "bg-accent-soft/40"
                    )}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted">
                      <Icon className="size-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{d.title}</span>
                        {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{d.body}</span>
                      <span className="mt-1 block text-[11px] text-faint">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
