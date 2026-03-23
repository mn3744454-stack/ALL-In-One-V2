import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Heart, DoorOpen, ChevronRight, BarChart3 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  city: string | null;
}

interface BranchOverviewProps {
  branches: Branch[];
  onSelectBranch: (branchId: string) => void;
}

export function BranchOverview({ branches, onSelectBranch }: BranchOverviewProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  // Fetch aggregate stats per branch
  const { data: branchStats = {} } = useQuery({
    queryKey: ['branch-overview-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};

      const [facilitiesRes, horsesRes, unitsRes, occupantsRes] = await Promise.all([
        supabase
          .from('facility_areas')
          .select('id, branch_id')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        supabase
          .from('horses')
          .select('id, current_location_id')
          .eq('tenant_id', tenantId)
          .not('current_location_id', 'is', null),
        supabase
          .from('housing_units')
          .select('id, branch_id')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        supabase
          .from('housing_unit_occupants')
          .select('id, unit_id')
          .eq('tenant_id', tenantId)
          .is('until', null),
      ]);

      const units = unitsRes.data || [];
      const occupants = occupantsRes.data || [];
      const occupiedUnitIds = new Set(occupants.map((o: any) => o.unit_id));

      const stats: Record<string, { facilities: number; horses: number; totalUnits: number; occupiedUnits: number }> = {};

      for (const branch of branches) {
        const branchUnits = units.filter((u: any) => u.branch_id === branch.id);
        stats[branch.id] = {
          facilities: (facilitiesRes.data || []).filter((f: any) => f.branch_id === branch.id).length,
          horses: (horsesRes.data || []).filter((h: any) => h.current_location_id === branch.id).length,
          totalUnits: branchUnits.length,
          occupiedUnits: branchUnits.filter((u: any) => occupiedUnitIds.has(u.id)).length,
        };
      }
      return stats;
    },
    enabled: !!tenantId && branches.length > 0,
  });

  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('housing.branchScope.noBranches')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t('housing.branchScope.overviewDesc')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => {
          const stats = branchStats[branch.id] || { facilities: 0, horses: 0, totalUnits: 0, occupiedUnits: 0 };
          const occupancyLabel = stats.totalUnits > 0
            ? `${stats.occupiedUnits}/${stats.totalUnits}`
            : '—';
          return (
            <Card
              key={branch.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onSelectBranch(branch.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{branch.name}</h3>
                      {branch.city && (
                        <p className="text-xs text-muted-foreground">{branch.city}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors",
                    dir === 'rtl' && "rotate-180"
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <DoorOpen className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-semibold">{stats.facilities}</p>
                    <p className="text-[10px] text-muted-foreground">{t('housing.branchScope.facilities')}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <Heart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-semibold">{stats.horses}</p>
                    <p className="text-[10px] text-muted-foreground">{t('housing.branchScope.horses')}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-semibold">{occupancyLabel}</p>
                    <p className="text-[10px] text-muted-foreground">{t('housing.branchScope.occupancy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
