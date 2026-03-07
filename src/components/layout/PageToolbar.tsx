import { ReactNode } from "react";

interface PageToolbarProps {
  /** Page title displayed as h1 */
  title: string;
  /** Optional action buttons rendered on the right */
  actions?: ReactNode;
}

/**
 * Desktop-only page toolbar rendered inside the scrollable main area.
 * Shows page title (h1) and optional action buttons.
 * Mobile uses MobilePageHeader separately.
 */
export function PageToolbar({ title, actions }: PageToolbarProps) {
  return (
    <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border/30">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
