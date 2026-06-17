import { ArrowRight } from "../../lib/icons";
import { Card, Button, Badge } from "../ui";
import { templateIcon } from "../../lib/templateIcon";

/**
 * App Store–style editorial template card.
 */
export default function TemplateCard({ template, onUse, loading }) {
  const Icon = templateIcon(template.thumbnail);
  return (
    <Card interactive className="group flex flex-col overflow-hidden">
      <div className="flex h-32 items-center justify-center border-b border-hairline bg-sunken">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-hairline bg-surface text-ink shadow-soft transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-7" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{template.title}</h3>
          <Badge variant="outline" className="ml-auto">
            {template.category}
          </Badge>
        </div>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
          {template.description}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4 justify-center"
          iconRight={ArrowRight}
          loading={loading}
          onClick={() => onUse?.(template)}
        >
          Use template
        </Button>
      </div>
    </Card>
  );
}
