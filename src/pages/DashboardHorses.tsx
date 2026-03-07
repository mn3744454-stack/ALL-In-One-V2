import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { HorsesList } from "@/components/horses";
import { Heart } from "lucide-react";

const DashboardHorses = () => {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { horses, loading: horsesLoading, refresh } = useHorses();
  const { t } = useI18n();

  return (
    <DashboardShell>
      {/* Mobile Page Header */}
      <MobilePageHeader title={t("sidebar.myHorses")} />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 lg:p-8">
          {!activeTenant ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-navy mb-2">
                No Organization Selected
              </h2>
              <p className="text-muted-foreground mb-4">
                Please create or join an organization to manage horses.
              </p>
              <Link to="/select-role">
                <Button variant="gold">Create Organization</Button>
              </Link>
            </div>
          ) : (
            <HorsesList
              horses={horses}
              loading={horsesLoading}
              onRefresh={refresh}
              onHorseClick={(horse) => navigate(`/dashboard/horses/${horse.id}`)}
            />
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default DashboardHorses;
