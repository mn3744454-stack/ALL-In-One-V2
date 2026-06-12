// B2.5e Phase 2 — Section rail for the contracts editor shell.
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EditorRailItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  hasIssue?: boolean;
}

interface Props {
  items: EditorRailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  orientation: "vertical" | "horizontal";
}

export function EditorSectionRail({ items, activeId, onSelect, orientation }: Props) {
  const isVertical = orientation === "vertical";
  return (
    <nav
      aria-label="Editor sections"
      className={cn(
        isVertical
          ? "flex flex-col gap-1 border border-border rounded-md p-2 bg-card"
          : "flex gap-1 overflow-x-auto pb-1 -mx-1 px-1",
      )}
    >
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-md text-sm transition-colors whitespace-nowrap",
              isVertical
                ? "w-full justify-between px-3 py-2 text-start"
                : "px-3 py-1.5 border border-border bg-card flex-shrink-0",
              active
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              {it.icon && <span className="opacity-80 shrink-0">{it.icon}</span>}
              <span className="truncate">{it.label}</span>
              {it.hasIssue && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-destructive shrink-0"
                  aria-hidden
                />
              )}
            </span>
            {typeof it.count === "number" && (
              <span
                className={cn(
                  "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center shrink-0",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
