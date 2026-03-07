import { ReactNode } from "react";
import { WorkspaceModeToggle } from "@/components/WorkspaceModeToggle";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { LanguageSelector } from "@/components/ui/language-selector";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { LogOut } from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
  /** Optional extra actions on the right side (e.g. "Create" button) */
  rightSlot?: ReactNode;
}

/**
 * Shared desktop header for all organization dashboard pages.
 * Always renders WorkspaceModeToggle, TenantSwitcher, RoleSwitcher,
 * LanguageSelector, NotificationsPanel, and LogOut.
 * 
 * Desktop only — mobile headers are handled by MobilePageHeader separately.
 */
export function DashboardHeader({ rightSlot }: DashboardHeaderProps) {
  const { workspaceMode } = useTenant();
  const { signOut } = useAuth();
  const { t } = useI18n();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="shrink-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
        <div className="flex items-center justify-between gap-4 h-16 px-8">
          {/* Left: Workspace + Tenant controls */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <WorkspaceModeToggle />
            {workspaceMode === "organization" && (
              <>
                <TenantSwitcher />
                <RoleSwitcher />
              </>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightSlot}
            <LanguageSelector />
            <NotificationsPanel />
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              aria-label={t("common.logout") || "Sign out"}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
      />
    </>
  );
}
