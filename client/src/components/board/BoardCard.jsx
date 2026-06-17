import { Link } from "react-router-dom";
import {
  Star,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  StickyNote,
  Users,
  Crown,
} from "../../lib/icons";
import { Card, AvatarGroup, DropdownMenu, IconButton, Tooltip } from "../ui";
import { timeAgo } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Soft, calm preview band — abstract, no per-card network fetch. */
function Preview({ board }) {
  const accent = board.color || "var(--color-line)";
  const count = board._count?.notes ?? 0;
  const blocks = Math.min(count, 5);
  return (
    <div className="relative h-28 overflow-hidden rounded-lg border border-hairline bg-sunken">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent, opacity: 0.85 }}
      />
      {count === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-faint">
          Empty board
        </div>
      ) : (
        <div className="flex h-full items-end gap-1.5 p-3">
          {Array.from({ length: blocks }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-md border border-hairline bg-surface"
              style={{ height: `${40 + ((i * 17) % 45)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Menu({ board, isOwner, onRename, onArchive, onDelete }) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <IconButton
          icon={MoreHorizontal}
          label="Board options"
          size="sm"
          onClick={(e) => e.preventDefault()}
        />
      }
    >
      {isOwner && (
        <DropdownMenu.Item icon={Pencil} onSelect={() => onRename?.(board)}>
          Rename
        </DropdownMenu.Item>
      )}
      {isOwner && (
        <DropdownMenu.Item
          icon={board.isArchived ? ArchiveRestore : Archive}
          onSelect={() => onArchive?.(board)}
        >
          {board.isArchived ? "Restore" : "Archive"}
        </DropdownMenu.Item>
      )}
      {isOwner && <DropdownMenu.Separator />}
      {isOwner && (
        <DropdownMenu.Item icon={Trash2} danger onSelect={() => onDelete?.(board)}>
          Delete
        </DropdownMenu.Item>
      )}
      {!isOwner && (
        <DropdownMenu.Item icon={Users} onSelect={() => {}}>
          Shared with you
        </DropdownMenu.Item>
      )}
    </DropdownMenu>
  );
}

export default function BoardCard({
  board,
  currentUserId,
  view = "grid",
  onToggleStar,
  onRename,
  onArchive,
  onDelete,
}) {
  const isOwner = board.ownerId === currentUserId;
  const members = board.members?.map((m) => m.user || m) || [];
  const collaborators = [board.owner, ...members].filter(Boolean);

  const StarBtn = (
    <Tooltip label={board.isStarred ? "Unstar" : "Star"} side="bottom">
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleStar?.(board);
        }}
        className={cn(
          "rounded-md p-1.5 transition-colors",
          board.isStarred
            ? "text-accent"
            : "text-faint opacity-0 hover:text-muted group-hover:opacity-100"
        )}
        aria-label={board.isStarred ? "Unstar board" : "Star board"}
      >
        <Star className="size-4" fill={board.isStarred ? "currentColor" : "none"} strokeWidth={2} />
      </button>
    </Tooltip>
  );

  if (view === "list") {
    return (
      <Card
        as={Link}
        to={`/board/${board.id}`}
        interactive
        className="group flex items-center gap-4 px-4 py-3"
      >
        <span
          className="size-2.5 shrink-0 rounded-[4px]"
          style={{ backgroundColor: board.color || "var(--color-line)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{board.title}</span>
            {isOwner ? (
              <Crown className="size-3.5 shrink-0 text-faint" />
            ) : (
              <Users className="size-3.5 shrink-0 text-faint" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <StickyNote className="size-3" /> {board._count?.notes ?? 0}
            </span>
            <span>Updated {timeAgo(board.lastActivityAt || board.updatedAt)}</span>
          </div>
        </div>
        <AvatarGroup users={collaborators} size="xs" max={3} />
        {StarBtn}
        <Menu board={board} isOwner={isOwner} onRename={onRename} onArchive={onArchive} onDelete={onDelete} />
      </Card>
    );
  }

  return (
    <Card as={Link} to={`/board/${board.id}`} interactive className="group flex flex-col p-3">
      <Preview board={board} />
      <div className="flex items-start gap-2 px-1 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-ink">{board.title}</h3>
            {isOwner ? (
              <Crown className="size-3.5 shrink-0 text-faint" />
            ) : (
              <Users className="size-3.5 shrink-0 text-faint" />
            )}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <StickyNote className="size-3" /> {board._count?.notes ?? 0}
            </span>
            <span>·</span>
            <span>{timeAgo(board.lastActivityAt || board.updatedAt)}</span>
          </p>
        </div>
        <div className="-mr-1 flex items-center">
          {StarBtn}
          <Menu board={board} isOwner={isOwner} onRename={onRename} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>
      {collaborators.length > 0 && (
        <div className="px-1 pt-1">
          <AvatarGroup users={collaborators} size="xs" max={4} />
        </div>
      )}
    </Card>
  );
}
