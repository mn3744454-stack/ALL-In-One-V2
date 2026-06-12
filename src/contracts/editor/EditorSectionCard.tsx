// B2.5e Phase 2 — Collapsible section card for the contracts editor shell.
// IMPORTANT: children remain mounted when collapsed (hidden via CSS) so that
// TipTap editors and uncontrolled form inputs do not lose state.
import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: ReactNode;
  count?: number;
  badge?: ReactNode;
  headerAside?: ReactNode;
  hasIssue?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function EditorSectionCard({
  title,
  description,
  count,
  badge,
  headerAside,
  hasIssue,
  isOpen,
  onToggle,
  children,
}: Props) {
  return (
    <Card className={cn(hasIssue && "border-destructive/50")}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 min-w-0 inline-flex items-center gap-2 text-start"
            aria-expanded={isOpen}
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform shrink-0 text-muted-foreground",
                !isOpen && "-rotate-90",
              )}
            />
            <span className="font-semibold text-sm truncate">{title}</span>
            {typeof count === "number" && (
              <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground">
                {count}
              </span>
            )}
            {badge}
            {hasIssue && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-destructive"
                aria-hidden
              />
            )}
          </button>
          {headerAside && (
            <div className="shrink-0 flex items-center gap-2">{headerAside}</div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 ms-6">{description}</p>
        )}
      </CardHeader>
      <CardContent className={cn(!isOpen && "hidden")}>{children}</CardContent>
    </Card>
  );
}
