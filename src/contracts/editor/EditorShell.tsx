// B2.5e Phase 2b — Contracts editor shell.
// Lab-style focused container: centered, max-w-6xl, internal scroll body,
// sticky shell header, side rail (desktop) / horizontal jump bar (mobile)
// rendered INSIDE the focused container so it does not collide with the
// app sidebar and the body editor occupies the main content area.
// Section content stays mounted when collapsed to preserve TipTap/form state.
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorSectionRail, type EditorRailItem } from "./EditorSectionRail";
import { EditorSectionCard } from "./EditorSectionCard";
import { useRTL } from "@/hooks/useRTL";
import { cn } from "@/lib/utils";

export interface EditorShellSection {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  badge?: ReactNode;
  /** Show a warning dot on the rail (e.g. validation issues in a collapsed section). */
  hasIssue?: boolean;
  /** Collapsed by default? Body should usually be open. */
  defaultCollapsed?: boolean;
  /** Subtitle/description shown under the card title. */
  description?: ReactNode;
  /** Right-side header content inside the card (small actions, status). */
  headerAside?: ReactNode;
  content: ReactNode;
}

interface EditorShellProps {
  header?: ReactNode;
  /** Persistent action area rendered in the sticky shell header. */
  actions?: ReactNode;
  /** Optional validation/inline messages rendered above sections. */
  banner?: ReactNode;
  /** Optional sticky footer slot (reserved for Phase 3 — not used yet). */
  footer?: ReactNode;
  sections: EditorShellSection[];
}

export function EditorShell({ header, actions, banner, footer, sections }: EditorShellProps) {
  const { isRTL } = useRTL();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, !!s.defaultCollapsed])),
  );
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const items: EditorRailItem[] = useMemo(
    () =>
      sections.map((s) => ({
        id: s.id,
        label: s.label,
        icon: s.icon,
        count: s.count,
        hasIssue: s.hasIssue,
      })),
    [sections],
  );

  const handleSelect = useCallback((id: string) => {
    setCollapsed((c) => ({ ...c, [id]: false }));
    setActiveId(id);
    const el = refs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
    setActiveId(id);
  }, []);

  // Track active section by scroll position within the internal scroll container.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let current = activeId;
      let bestTop = Number.NEGATIVE_INFINITY;
      for (const s of sections) {
        const el = refs.current[s.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top - containerTop;
        if (top < 96 && top > bestTop) {
          bestTop = top;
          current = s.id;
        }
      }
      if (current !== activeId) setActiveId(current);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [sections, activeId]);

  return (
    <div
      className={cn(
        // Lab-style focused container
        "w-[95vw] max-w-6xl mx-auto",
        "max-h-[85vh] min-h-[60vh]",
        "bg-card border border-border rounded-2xl shadow-sm",
        "flex flex-col overflow-hidden",
      )}
    >
      {/* Sticky shell header */}
      {(header || actions) && (
        <div className="shrink-0 border-b border-border bg-card px-4 lg:px-6 py-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">{header}</div>
            {actions && (
              <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal scroll body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 lg:px-6 py-4 space-y-4">
          {banner}

          {/* Mobile / tablet horizontal jump bar (sticky inside scroll body) */}
          <div className="lg:hidden sticky top-0 z-10 -mx-4 px-4 py-2 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
            <EditorSectionRail
              items={items}
              activeId={activeId}
              onSelect={handleSelect}
              orientation="horizontal"
            />
          </div>

          <div className={cn("grid gap-4 lg:gap-6", "lg:grid-cols-[200px_minmax(0,1fr)]")}>
            {/* Desktop side rail — inside the focused container */}
            <aside className={cn("hidden lg:block", isRTL ? "lg:order-2" : "lg:order-1")}>
              <div className="sticky top-2">
                <EditorSectionRail
                  items={items}
                  activeId={activeId}
                  onSelect={handleSelect}
                  orientation="vertical"
                />
              </div>
            </aside>

            {/* Main content column */}
            <div className={cn("min-w-0 space-y-4", isRTL ? "lg:order-1" : "lg:order-2")}>
              {sections.map((s) => (
                <div
                  key={s.id}
                  ref={(el) => {
                    refs.current[s.id] = el;
                  }}
                  data-section-id={s.id}
                  style={{ scrollMarginTop: 12 }}
                >
                  <EditorSectionCard
                    title={s.label}
                    description={s.description}
                    count={s.count}
                    badge={s.badge}
                    hasIssue={s.hasIssue}
                    headerAside={s.headerAside}
                    isOpen={!collapsed[s.id]}
                    onToggle={() => handleToggle(s.id)}
                  >
                    {s.content}
                  </EditorSectionCard>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reserved footer slot (Phase 3) */}
      {footer && (
        <div className="shrink-0 border-t border-border bg-card px-4 lg:px-6 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
