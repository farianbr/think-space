import { useEffect } from "react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Plus,
  ArrowRight,
  LayoutGrid,
  Star,
  Users,
  Sparkles,
  FolderOpen,
} from "../lib/icons";

import { connectSocket } from "../lib/socket";
import { useAuth } from "../contexts/authContext";
import { useMyBoards, useBoardsSocket } from "../hooks/boards";
import { useWorkspaceActivity } from "../hooks/activity";
import { useTemplates, useUseTemplate } from "../hooks/templates";
import { useBoardManagement } from "../hooks/useBoardManagement";
import { displayName } from "../lib/format";
import { templateIcon } from "../lib/templateIcon";

import BoardCard from "../components/board/BoardCard";
import ActivityFeed from "../components/activity/ActivityFeed";
import { Button, Card, EmptyState, Skeleton } from "../components/ui";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        {Icon && <Icon className="size-4 text-muted" strokeWidth={2} aria-hidden />}
        {title}
      </h2>
      {action}
    </div>
  );
}

function CardSkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-52" />
      ))}
    </div>
  );
}

export default function BoardsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCreateBoard } = useOutletContext() || {};
  const { data: boards, isLoading } = useMyBoards("all");
  const { data: activities, isLoading: activityLoading } = useWorkspaceActivity(12);
  const { data: templates = [] } = useTemplates();
  const useTemplate = useUseTemplate();
  const { handlers, modals } = useBoardManagement();

  const { setup } = useBoardsSocket();
  useEffect(() => {
    connectSocket();
    return setup();
  }, [setup]);

  const all = boards || [];
  const recent = all.slice(0, 6);
  const starred = all.filter((b) => b.isStarred).slice(0, 6);
  const shared = all.filter((b) => b.ownerId !== user?.id).slice(0, 6);

  const onUseTemplate = async (t) => {
    try {
      const board = await useTemplate.mutateAsync({ slug: t.slug });
      toast.success("Board created from template");
      if (board?.id) navigate(`/board/${board.id}`);
    } catch {
      toast.error("Could not create from template");
    }
  };

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((b) => (
        <BoardCard key={b.id} board={b} currentUserId={user?.id} {...handlers} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {displayName(user)}
          </h1>
        </div>
        <Button icon={Plus} onClick={openCreateBoard}>
          New board
        </Button>
      </div>

      {isLoading ? (
        <CardSkeletonGrid count={6} />
      ) : all.length === 0 ? (
        <Card className="px-6">
          <EmptyState
            icon={Sparkles}
            title="Your canvas is empty"
            description="Create your first board or start from a template — your ideas deserve room to breathe."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button icon={Plus} onClick={openCreateBoard}>
                  Create a board
                </Button>
                <Button as={Link} to="/templates" variant="secondary" iconRight={ArrowRight}>
                  Browse templates
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-2">
            <section>
              <SectionHeader
                icon={LayoutGrid}
                title="Recent"
                action={
                  <Link
                    to="/boards"
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
                  >
                    All boards <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {renderGrid(recent)}
            </section>

            {starred.length > 0 && (
              <section>
                <SectionHeader
                  icon={Star}
                  title="Starred"
                  action={
                    <Link
                      to="/boards?filter=favorites"
                      className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
                    >
                      View all <ArrowRight className="size-3.5" />
                    </Link>
                  }
                />
                {renderGrid(starred)}
              </section>
            )}

            {shared.length > 0 && (
              <section>
                <SectionHeader
                  icon={Users}
                  title="Shared with you"
                  action={
                    <Link
                      to="/boards?filter=shared"
                      className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
                    >
                      View all <ArrowRight className="size-3.5" />
                    </Link>
                  }
                />
                {renderGrid(shared)}
              </section>
            )}
          </div>

          {/* Aside */}
          <div className="space-y-6">
            <Card className="p-5">
              <SectionHeader title="Team activity" />
              <ActivityFeed
                activities={activities}
                isLoading={activityLoading}
                showBoard
                compact
              />
            </Card>

            <Card className="p-5">
              <SectionHeader
                title="Start from a template"
                action={
                  <Link
                    to="/templates"
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
                  >
                    All <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <div className="flex flex-col gap-1">
                {templates.slice(0, 4).map((t) => {
                  const Icon = templateIcon(t.thumbnail);
                  return (
                    <button
                      key={t.slug}
                      onClick={() => onUseTemplate(t)}
                      disabled={useTemplate.isPending}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sunken disabled:opacity-60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface text-muted">
                        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{t.title}</span>
                        <span className="block truncate text-xs text-muted">{t.description}</span>
                      </span>
                    </button>
                  );
                })}
                {templates.length === 0 && (
                  <EmptyState icon={FolderOpen} size="sm" title="No templates" />
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {modals}
    </div>
  );
}
