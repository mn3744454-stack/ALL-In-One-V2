import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * L4-a-3a — Shared presentational chrome for read-only Lab report dialogs.
 *
 * Pure presentational. Does not fetch, mutate, or own publish/share/print/PDF.
 * Provides a 3-row column suitable to slot directly inside a `DialogContent`
 * that is itself `flex flex-col p-0` with a constrained max-height.
 *
 * Layout (project workspace-dialog standard: flex-col, shrink-0 chrome,
 * single scrollable body — no nested scroll traps):
 *   - compact header  (shrink-0, print:hidden)
 *   - body            (flex-1, the ONLY scroll container)
 *   - footer          (shrink-0, print:hidden)
 */

export interface ReportChromeProps {
  /** Primary line in the compact header — e.g. horse name. */
  compactTitle?: ReactNode;
  /** Secondary line — e.g. "3 analyses · 12 May 2026". */
  compactSubtitle?: ReactNode;
  /** Optional trailing slot — usually a small status pill. */
  statusBadge?: ReactNode;
  /** Scrollable report body. */
  children: ReactNode;
  /** Optional sticky footer action row. */
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function ReportChrome({
  compactTitle,
  compactSubtitle,
  statusBadge,
  children,
  footer,
  className,
  bodyClassName,
}: ReportChromeProps) {
  const hasHeader = !!(compactTitle || compactSubtitle || statusBadge);

  return (
    <div className={cn("flex flex-col min-h-0 h-full w-full", className)}>
      {hasHeader && (
        <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-11">
            <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
              {compactTitle && (
                <span className="text-sm font-semibold truncate">
                  {compactTitle}
                </span>
              )}
              {compactSubtitle && (
                <span className="text-xs text-muted-foreground truncate">
                  {compactSubtitle}
                </span>
              )}
            </div>
            {statusBadge && <div className="shrink-0">{statusBadge}</div>}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4",
          bodyClassName
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 py-2 print:hidden">
          {footer}
        </div>
      )}
    </div>
  );
}
