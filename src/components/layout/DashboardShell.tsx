import { ReactNode, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";

interface DashboardShellProps {
  children: ReactNode;
  /** Hide the sidebar entirely (for personal mode pages or detail views) */
  hideSidebar?: boolean;
}

/**
 * Centralized desktop layout shell enforcing the Golden Layout Contract:
 * 
 * RULE 1: Outer shell = h-dvh w-full flex overflow-hidden
 * RULE 2: Sidebar = fixed column, h-full, overflow-y-auto (nav list scroll)
 * RULE 3: Right column = flex-1 flex flex-col min-h-0 min-w-0
 * RULE 4: Header = shrink-0, consistent controls across all org pages
 * RULE 5: Main = flex-1 overflow-y-auto min-h-0 min-w-0 (page scroll region)
 * RULE 7: RTL handled via dir attribute on outer shell
 * RULE 8: Mobile/tablet nav is separate and unchanged
 * 
 * Mobile/tablet rendering is left to page children (MobilePageHeader, 
 * MobileBottomNav, etc.) which are rendered inside the scrollable main area.
 */
export function DashboardShell({ children, hideSidebar }: DashboardShellProps) {
  const { workspaceMode } = useTenant();
  const { dir } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showSidebar = !hideSidebar && workspaceMode === "organization";

  return (
    <div className="h-dvh w-full bg-cream flex overflow-hidden" dir={dir}>
      {/* Desktop Sidebar — hidden on mobile via internal responsive classes */}
      {showSidebar && (
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Right column */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Consistent desktop header */}
        <DashboardHeader />

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto min-h-0 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
