import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { HorsesList } from "@/components/horses";
import { Heart, Home } from "lucide-react";

const DashboardHorses = () => {
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { horses, loading: horsesLoading, refresh } = useHorses();
  const { t } = useI18n();

  const isHorseOwnerTenant = activeTenant?.tenant?.type === "horse_owner";
  // Phase B: an owner-created horse is "unhosted" when it has no current
  // physical location / housing unit (no active boarding admission has placed
  // it). We derive purely from existing columns — no new status added.
  const unhostedCount = isHorseOwnerTenant
    ? horses.filter(
        (h) => !h.current_location_id && !h.housing_unit_id,
      ).length
    : 0;

  return (
    <DashboardShell>
      {/* Mobile Page Header */}
      <MobilePageHeader
        title={isHorseOwnerTenant ? t("horseOwner.myHorsesTitle") : t("sidebar.myHorses")}
      />

      <div className="p-4 lg:p-8 space-y-4">
        {/* Horse Owner Phase B banner — truthful, scope-limited */}
        {isHorseOwnerTenant && (
          <div className="rounded-xl border border-border/60 bg-cream-dark/40 p-4 flex items-start gap-3">
            <Home className="w-5 h-5 text-navy/60 mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-navy">
                {t("horseOwner.banner.title")}
              </p>
              <p className="text-xs text-navy/60 leading-relaxed">
                {t("horseOwner.banner.body")}
              </p>
              {unhostedCount > 0 && (
                <p className="text-xs text-navy/70 pt-1">
                  {t("horseOwner.banner.unhostedCount").replace("{count}", String(unhostedCount))}
                </p>
              )}
            </div>
          </div>
        )}

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
            ownerMode={isHorseOwnerTenant}
          />
        )}
      </div>
    </DashboardShell>
  );
};

export default DashboardHorses;
