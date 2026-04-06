import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Heart, DoorOpen, ChevronDown, BarChart3, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";
import { ExpandedBranchDetail } from "./ExpandedBranchDetail";
import { CreateBranchWizard } from "./CreateBranchWizard";
import { LifecycleFilterChips, type LifecycleFilter } from "./LifecycleFilterChips";
import { LifecycleStateBadge } from "./LifecycleActionMenu";
import { useLocations } from "@/hooks/movement/useLocations";

interface BranchOverviewProps {
  onNavigateToTab?: (tab: string) => void;
  selectedBranchId?: string;
}

export function BranchOverview({ onNavigateToTab, selectedBranchId }: BranchOverviewProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { locations } = useLocations();
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active');

  // Filter branches by selected branch and lifecycle
  const allBranches = useMemo(() => {
    if (selectedBranchId && selectedBranchId !== '__all__') {
      return locations.filter(l => l.id === selectedBranchId);
    }
    return locations;
  }, [locations, selectedBranchId]);

  const filteredBranches = useMemo(() => {
    switch (lifecycleFilter) {
      case 'active': return allBranches.filter(b => b.is_active && !b.is_archived);
      case 'deactivated': return allBranches.filter(b => !b.is_active && !b.is_archived);
      case 'archived': return allBranches.filter(b => b.is_archived);
      default: return allBranches.filter(b => b.is_active && !b.is_archived);
    }
  }, [allBranches, lifecycleFilter]);

  const lifecycleCounts = useMemo(() => ({
    active: allBranches.filter(b => b.is_active && !b.is_archived).length,
    deactivated: allBranches.filter(b => !b.is_active && !b.is_archived).length,
    archived: allBranches.filter(b => b.is_archived).length,
  }), [allBranches]);

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

      for (const branch of allBranches) {
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
    enabled: !!tenantId && allBranches.length > 0,
  });

  const toggleBranch = (branchId: string) => {
    setExpandedBranchId(prev => prev === branchId ? null : branchId);
  };

  if (allBranches.length === 0 && lifecycleFilter === 'active') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('housing.branchScope.noBranches')}</p>
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('housing.branchWizard.createBranch')}
          </Button>
          <CreateBranchWizard open={wizardOpen} onOpenChange={setWizardOpen} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('housing.branchScope.overviewDesc')}
        </p>
        <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          {t('housing.branchWizard.createBranch')}
        </Button>
      </div>

      {/* Lifecycle filter chips */}
      {allBranches.length > 0 && (
        <LifecycleFilterChips
          value={lifecycleFilter}
          onChange={setLifecycleFilter}
          counts={lifecycleCounts}
          context="branches"
        />
      )}

      {filteredBranches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {lifecycleFilter === 'archived'
                ? t('housing.lifecycle.noArchived')
                : lifecycleFilter === 'deactivated'
                  ? t('housing.lifecycle.noDeactivated')
                  : t('housing.branchScope.noBranches')
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBranches.map((branch) => {
            const stats = branchStats[branch.id] || { facilities: 0, horses: 0, totalUnits: 0, occupiedUnits: 0 };
            const occupancyLabel = stats.totalUnits > 0
              ? `${stats.occupiedUnits}/${stats.totalUnits}`
              : '—';
            const isExpanded = expandedBranchId === branch.id;

            return (
              <Card
                key={branch.id}
                className={cn(
                  "transition-all",
                  isExpanded
                    ? "ring-2 ring-primary/30 shadow-md"
                    : "cursor-pointer hover:shadow-md"
                )}
              >
                {/* Collapsed header — always visible */}
                <div
                  className={cn("p-4 sm:p-5", isExpanded ? "" : "cursor-pointer")}
                  onClick={() => toggleBranch(branch.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <BilingualName
                            name={branch.name}
                            nameAr={branch.name_ar}
                            primaryClassName="text-base font-semibold text-foreground"
                            secondaryClassName="text-xs"
                          />
                          <LifecycleStateBadge isActive={branch.is_active} isArchived={branch.is_archived} />
                        </div>
                        {branch.city && (
                          <p className="text-xs text-muted-foreground">{branch.city}</p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </div>

                  {/* Summary metrics — only when collapsed */}
                  {!isExpanded && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <DoorOpen className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-semibold">{stats.facilities}</p>
                        <p className="text-xs text-muted-foreground">{t('housing.branchScope.facilities')}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Heart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-semibold">{stats.horses}</p>
                        <p className="text-xs text-muted-foreground">{t('housing.branchScope.horses')}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-semibold">{occupancyLabel}</p>
                        <p className="text-xs text-muted-foreground">{t('housing.branchScope.occupancy')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded detail — INSIDE the same Card */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/40 pt-4">
                    <ExpandedBranchDetail
                      branch={branch as any}
                      onNavigateToTab={onNavigateToTab}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CreateBranchWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
