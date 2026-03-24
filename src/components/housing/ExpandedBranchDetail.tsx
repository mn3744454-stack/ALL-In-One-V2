import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Heart, DoorOpen, BarChart3, MapPin, ChevronDown, ChevronUp,
  Plus, ClipboardCheck, ArrowLeftRight, Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
}

interface FacilityWithHorses {
  id: string;
  name: string;
  name_ar: string | null;
  facility_type: string;
  totalUnits: number;
  occupiedUnits: number;
  horses: { id: string; name: string; name_ar: string | null }[];
}

interface ExpandedBranchDetailProps {
  branch: Branch;
  onNavigateToTab?: (tab: string) => void;
}

export function ExpandedBranchDetail({ branch, onNavigateToTab }: ExpandedBranchDetailProps) {
  const { t, dir, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const [expandedFacilities, setExpandedFacilities] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['expanded-branch-detail', tenantId, branch.id],
    queryFn: async () => {
      if (!tenantId) return null;

      const [facilitiesRes, unitsRes, occupantsRes, horsesRes] = await Promise.all([
        supabase
          .from('facility_areas')
          .select('id, name, name_ar, facility_type')
          .eq('tenant_id', tenantId)
          .eq('branch_id', branch.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('housing_units')
          .select('id, area_id, branch_id')
          .eq('tenant_id', tenantId)
          .eq('branch_id', branch.id)
          .eq('is_active', true),
        supabase
          .from('housing_unit_occupants')
          .select('id, unit_id, horse_id')
          .eq('tenant_id', tenantId)
          .is('until', null),
        supabase
          .from('horses')
          .select('id, name, name_ar, current_location_id')
          .eq('tenant_id', tenantId)
          .eq('current_location_id', branch.id),
      ]);

      const facilities = facilitiesRes.data || [];
      const units = unitsRes.data || [];
      const occupants = occupantsRes.data || [];
      const horses = horsesRes.data || [];

      // Build unit-to-area mapping
      const unitToArea: Record<string, string> = {};
      units.forEach((u: any) => { if (u.area_id) unitToArea[u.id] = u.area_id; });

      // Build occupied unit set and horse-to-area mapping
      const occupiedUnitIds = new Set(occupants.map((o: any) => o.unit_id));
      const horseToArea: Record<string, string> = {};
      occupants.forEach((o: any) => {
        const area = unitToArea[o.unit_id];
        if (area) horseToArea[o.horse_id] = area;
      });

      // Build facility data with horses
      const facilitiesWithHorses: FacilityWithHorses[] = facilities.map((f: any) => {
        const facilityUnits = units.filter((u: any) => u.area_id === f.id);
        const facilityHorses = horses.filter((h: any) => horseToArea[h.id] === f.id);
        return {
          id: f.id,
          name: f.name,
          name_ar: f.name_ar,
          facility_type: f.facility_type,
          totalUnits: facilityUnits.length,
          occupiedUnits: facilityUnits.filter((u: any) => occupiedUnitIds.has(u.id)).length,
          horses: facilityHorses.map((h: any) => ({ id: h.id, name: h.name, name_ar: h.name_ar })),
        };
      });

      // Horses not assigned to any facility (present at branch but not in a unit)
      const assignedHorseIds = new Set(Object.keys(horseToArea));
      const unassignedHorses = horses
        .filter((h: any) => !assignedHorseIds.has(h.id))
        .map((h: any) => ({ id: h.id, name: h.name, name_ar: h.name_ar }));

      const totalUnits = units.length;
      const occupiedUnits = units.filter((u: any) => occupiedUnitIds.has(u.id)).length;

      return {
        facilities: facilitiesWithHorses,
        totalHorses: horses.length,
        totalUnits,
        occupiedUnits,
        unassignedHorses,
      };
    },
    enabled: !!tenantId,
  });

  const toggleFacility = (facilityId: string) => {
    setExpandedFacilities(prev => {
      const next = new Set(prev);
      if (next.has(facilityId)) next.delete(facilityId);
      else next.add(facilityId);
      return next;
    });
  };

  const horseName = (h: { name: string; name_ar: string | null }) =>
    lang === 'ar' && h.name_ar ? h.name_ar : h.name;

  const facilityDisplayName = (f: { name: string; name_ar: string | null }) =>
    lang === 'ar' && f.name_ar ? f.name_ar : f.name;

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const occupancyPct = data.totalUnits > 0 ? Math.round((data.occupiedUnits / data.totalUnits) * 100) : 0;
  const vacantUnits = data.totalUnits - data.occupiedUnits;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* ── Branch Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{branch.name}</h3>
            {(branch.city || branch.address) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[branch.city, branch.address].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToTab && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onNavigateToTab('facilities')}>
                <Plus className="h-3.5 w-3.5" />
                {t('housing.facilities.addFacility')}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onNavigateToTab('admissions')}>
                <ClipboardCheck className="h-3.5 w-3.5" />
                {t('housing.tabs.admissions')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={DoorOpen} label={t('housing.branchScope.facilities')} value={data.facilities.length} />
        <StatCard icon={Heart} label={t('housing.branchScope.horses')} value={data.totalHorses} />
        <StatCard
          icon={BarChart3}
          label={t('housing.branchScope.occupancy')}
          value={data.totalUnits > 0 ? `${data.occupiedUnits}/${data.totalUnits}` : '—'}
        />
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              vacantUnits > 0 ? "bg-primary/60" : data.totalUnits > 0 ? "bg-destructive" : "bg-muted-foreground/30"
            )} />
            <span className="text-xs text-muted-foreground">
              {data.totalUnits > 0
                ? `${vacantUnits} ${t('housing.branchScope.vacant')}`
                : t('housing.branchScope.noUnitsYet')}
            </span>
          </div>
          {data.totalUnits > 0 && (
            <Progress value={occupancyPct} className="h-1.5" />
          )}
        </div>
      </div>

      {/* ── Facilities Section ── */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          {t('housing.branchScope.facilitiesSection')}
          <Badge variant="secondary" className="text-[10px]">{data.facilities.length}</Badge>
        </h4>

        {data.facilities.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">{t('housing.branchScope.noFacilitiesYet')}</p>
              {onNavigateToTab && (
                <Button variant="link" size="sm" className="mt-1" onClick={() => onNavigateToTab('facilities')}>
                  {t('housing.facilities.addFacility')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.facilities.map((facility) => {
              const isExpanded = expandedFacilities.has(facility.id);
              const fOccPct = facility.totalUnits > 0
                ? Math.round((facility.occupiedUnits / facility.totalUnits) * 100)
                : 0;

              return (
                <Card key={facility.id} className="overflow-hidden">
                  <button
                    className="w-full text-start p-3 sm:p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    onClick={() => toggleFacility(facility.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{facilityDisplayName(facility)}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {t(`housing.facilityTypes.${facility.facility_type}` as any)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {facility.totalUnits > 0 ? (
                          <>
                            <span>{facility.occupiedUnits}/{facility.totalUnits} {t('housing.branchScope.unitsOccupied')}</span>
                            <Progress value={fOccPct} className="h-1 w-16" />
                          </>
                        ) : (
                          <span>{t('housing.branchScope.noUnitsYet')}</span>
                        )}
                        {facility.horses.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {facility.horses.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {facility.horses.length > 0 && (
                      isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {/* Expanded horse names */}
                  {isExpanded && facility.horses.length > 0 && (
                    <div className="px-3 sm:px-4 pb-3 border-t bg-muted/20">
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {facility.horses.map((horse) => (
                          <Badge key={horse.id} variant="secondary" className="text-xs font-normal gap-1">
                            <Heart className="h-3 w-3 text-primary/70" />
                            {horseName(horse)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Unassigned Horses ── */}
      {data.unassignedHorses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            {t('housing.branchScope.unassignedHorses')}
            <Badge variant="secondary" className="text-[10px]">{data.unassignedHorses.length}</Badge>
          </h4>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-1.5">
                {data.unassignedHorses.map((horse) => (
                  <Badge key={horse.id} variant="outline" className="text-xs font-normal gap-1">
                    <Heart className="h-3 w-3 text-amber-500" />
                    {horseName(horse)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
