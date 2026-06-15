import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { LayoutTemplate } from "lucide-react";

import { useTemplates, useUseTemplate } from "../hooks/templates";
import TemplateCard from "../components/templates/TemplateCard";
import { EmptyState, Skeleton } from "../components/ui";
import { cn } from "../lib/cn";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const useTemplate = useUseTemplate();
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [pendingSlug, setPendingSlug] = useState(null);

  const categories = useMemo(() => {
    const set = new Set((templates || []).map((t) => t.category));
    return ["All", ...Array.from(set)];
  }, [templates]);

  const visible = (templates || []).filter(
    (t) => category === "All" || t.category === category
  );

  const onUse = async (t) => {
    setPendingSlug(t.slug);
    try {
      const board = await useTemplate.mutateAsync({ slug: t.slug });
      toast.success("Board created from template");
      if (board?.id) navigate(`/board/${board.id}`);
    } catch {
      toast.error("Could not create from template");
    } finally {
      setPendingSlug(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted">
        <LayoutTemplate className="size-4" strokeWidth={2} aria-hidden />
        Templates
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Start with a head start
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Curated, ready-to-run boards for brainstorming, planning, research and more.
        Pick one and make it yours.
      </p>

      {/* Category filters */}
      {!isLoading && (
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                category === c
                  ? "border-ink bg-ink text-ink-contrast"
                  : "border-hairline bg-surface text-muted hover:border-line hover:text-ink"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates here"
            description="Try another category."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <TemplateCard
                key={t.slug}
                template={t}
                onUse={onUse}
                loading={pendingSlug === t.slug}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
