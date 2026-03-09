import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Navigate } from "react-router-dom";
import { PublicProfileSettings } from "@/components/dashboard/PublicProfileSettings";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardPublicProfile = () => {
  const { user } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { t } = useI18n();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No tenant selected</p>
      </div>
    );
  }

  if (activeRole !== "owner") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardShell>
      {/* Mobile Header */}
      <MobilePageHeader title={t("publicProfile.title")} backTo="/dashboard" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PublicProfileSettings />
      </div>
    </DashboardShell>
  );
};

export default DashboardPublicProfile;
