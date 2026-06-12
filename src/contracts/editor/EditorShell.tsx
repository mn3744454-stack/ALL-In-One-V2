// B2.5e Phase 2c — Shared contracts editor shell.
// Lab Template-parity layout: fills its parent (Dialog or route fallback),
// sticky internal header, internal scroll body, leading-side rail (RTL-safe
// via dir + flex source order — NO order swap that would collide with a
// fixed-width grid track), main content always occupies the wide column.
// Section children stay mounted when collapsed to preserve TipTap/form state.
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorSectionRail, type EditorRailItem } from "./EditorSectionRail";
import { EditorSectionCard } from "./EditorSectionCard";
import { cn } from "@/lib/utils";

export interface EditorShellSection {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  badge?: ReactNode;
  hasIssue?: boolean;
  defaultCollapsed?: boolean;
  description?: ReactNode;
  headerAside?: ReactNode;
  content: ReactNode;
}

interface EditorShellProps {
  header?: ReactNode;
  actions?: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
  sections: EditorShellSection[];
}

/**
 * EditorShell is a pure presentational container. It fills its parent and
 * never imposes outer width/height — the parent (SafeFormDialog or route
 * fallback) owns sizing and chrome.
 */
export function EditorShell({ header, actions, banner, footer, sections }: EditorShellProps) {
  // Phase 3a.1 — All sections start collapsed on initial mount so the
  // Dialog opens in a compact accordion state. Re-opening the Dialog
  // remounts this component (Radix unmounts on close), giving a fresh
  // collapsed state per open. Rail/card clicks still toggle normally and
  // collapsed children remain mounted (see EditorSectionCard) to preserve
  // TipTap and form state across toggles.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, true])),
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
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Sticky shell header — reserve a safe area at the logical end for
          the Radix Dialog close X (positioned end-4 top-4) so action
          buttons never crowd or overlap the close control in either LTR
          or RTL. */}
      {(header || actions) && (
        <div className="shrink-0 border-b border-border bg-card ps-4 lg:ps-6 pe-12 lg:pe-14 py-3">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 bg-background">
        <div className="px-4 lg:px-6 py-4 space-y-4">
          {banner}

          {/* Mobile / tablet horizontal jump bar (sticky inside scroll body) */}
          <div className="lg:hidden sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
            <EditorSectionRail
              items={items}
              activeId={activeId}
              onSelect={handleSelect}
              orientation="horizontal"
            />
          </div>

          {/*
            Lab-parity layout: simple flex row. dir="rtl" on an ancestor (set
            by the i18n provider) places the rail visually on the right in
            RTL and on the left in LTR without any order swap. The main
            content always takes the wide flexible column.
          */}
          <div className="lg:flex lg:items-start lg:gap-6">
            {/* Desktop side rail — navigation only, fixed narrow column */}
            <aside
              aria-label="Editor sections"
              className={cn(
                "hidden lg:flex lg:flex-col lg:gap-1",
                "lg:sticky lg:top-2 lg:self-start lg:w-48 lg:shrink-0 lg:py-1",
              )}
            >
              <EditorSectionRail
                items={items}
                activeId={activeId}
                onSelect={handleSelect}
                orientation="vertical"
              />
            </aside>

            {/* Main content column — always takes the wide flexible area */}
            <div className="flex-1 min-w-0 space-y-4">
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
