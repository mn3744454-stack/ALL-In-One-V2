import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Navigate, useNavigate } from "react-router-dom";
import { PublicProfileSettings } from "@/components/dashboard/PublicProfileSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useI18n } from "@/i18n";

const DashboardPublicProfile = () => {
  const { user } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No tenant selected</p>
        </div>
      </DashboardShell>
    );
  }

  if (activeRole !== "owner") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardShell>
      <MobilePageHeader title={t("publicProfile.title")} backTo="/dashboard" />
      <PageToolbar title={t("publicProfile.title")} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 hidden lg:flex"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("common.back")}
        </Button>
        <PublicProfileSettings />
      </div>
    </DashboardShell>
  );
};

export default DashboardPublicProfile;
