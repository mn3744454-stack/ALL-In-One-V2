// B2.5e Phase 2 — Contracts editor shell.
// Provides a focused editor layout with a side section rail (desktop/tablet)
// and a horizontal jump bar (mobile). Section content stays mounted when
// collapsed to preserve TipTap and form state.
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
  /** Persistent action area (top of main column). */
  actions?: ReactNode;
  /** Optional validation/inline messages rendered above sections. */
  banner?: ReactNode;
  sections: EditorShellSection[];
}

export function EditorShell({ header, actions, banner, sections }: EditorShellProps) {
  const { isRTL } = useRTL();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, !!s.defaultCollapsed])),
  );
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
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

  // Track active section by scroll position.
  useEffect(() => {
    const onScroll = () => {
      let current = activeId;
      let bestTop = Number.NEGATIVE_INFINITY;
      for (const s of sections) {
        const el = refs.current[s.id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top < 120 && top > bestTop) {
          bestTop = top;
          current = s.id;
        }
      }
      if (current !== activeId) setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections, activeId]);

  return (
    <div className="space-y-4">
      {header}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 justify-end">{actions}</div>
      )}
      {banner}

      {/* Mobile jump bar */}
      <div className="lg:hidden -mx-4 px-4">
        <EditorSectionRail
          items={items}
          activeId={activeId}
          onSelect={handleSelect}
          orientation="horizontal"
        />
      </div>

      <div className={cn("grid gap-4 lg:gap-6", "lg:grid-cols-[220px_minmax(0,1fr)]")}>
        {/* Desktop/tablet side rail */}
        <aside className={cn("hidden lg:block", isRTL ? "lg:order-2" : "lg:order-1")}>
          <div className="sticky top-20">
            <EditorSectionRail
              items={items}
              activeId={activeId}
              onSelect={handleSelect}
              orientation="vertical"
            />
          </div>
        </aside>

        <div className={cn("min-w-0 space-y-4", isRTL ? "lg:order-1" : "lg:order-2")}>
          {sections.map((s) => (
            <div
              key={s.id}
              ref={(el) => {
                refs.current[s.id] = el;
              }}
              data-section-id={s.id}
              style={{ scrollMarginTop: 80 }}
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
  );
}
