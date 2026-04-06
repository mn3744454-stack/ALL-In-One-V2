import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BilingualName } from "@/components/ui/BilingualName";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UnitCell } from "./UnitCell";
import { UnitDetailsSheet } from "./UnitDetailsSheet";
import { AddUnitsDialog } from "./AddUnitsDialog";
import { OpenAreaContent } from "./OpenAreaContent";
import { ActivityContent } from "./ActivityContent";
import { LifecycleActionMenu, LifecycleStateBadge } from "./LifecycleActionMenu";
import { unitMatchesSearch, type OccupancyFilter } from "./FacilitiesManager";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { Building2, Edit, ChevronDown, ChevronUp, LayoutGrid, Dumbbell, Droplets, Warehouse, CircleDot, Fence, TreePine, ShieldAlert, Home, Plus } from "lucide-react";
import { SUBDIVISION_CONFIG } from "@/hooks/housing/useFacilityAreas";
import type { FacilityArea, FacilityType } from "@/hooks/housing/useFacilityAreas";
import type { FacilityWithUnits, InlineUnit } from "@/hooks/housing/useInlineFacilityUnits";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface FacilitySectionProps {
  facility: FacilityArea;
  facilityData?: FacilityWithUnits;
  isLoadingUnits: boolean;
  canManage: boolean;
  onEdit: (facilityId: string) => void;
  onToggleActive: (params: { id: string; isActive: boolean }) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  searchQuery?: string;
  activeFilter?: OccupancyFilter;
}

/** Icons for facility types */
const FACILITY_TYPE_ICONS: Partial<Record<FacilityType, React.ElementType>> = {
  barn: Home,
  isolation: ShieldAlert,
  paddock: Fence,
  pasture: TreePine,
  arena: Dumbbell,
  round_pen: CircleDot,
  wash_area: Droplets,
  storage: Warehouse,
};

function getNonHousingDescKey(type: FacilityType): string {
  switch (type) {
    case 'arena':
    case 'round_pen':
      return 'housing.facilities.activitySpaceDesc';
    case 'wash_area':
      return 'housing.facilities.serviceSpaceDesc';
    case 'storage':
      return 'housing.facilities.storageSpaceDesc';
    default:
      return 'housing.facilities.activitySpaceDesc';
  }
}

function getNonHousingLabelKey(type: FacilityType): string {
  switch (type) {
    case 'arena':
    case 'round_pen':
      return 'housing.facilities.activitySpace';
    case 'wash_area':
      return 'housing.facilities.serviceSpace';
    case 'storage':
      return 'housing.facilities.storageSpace';
    default:
      return 'housing.facilities.activitySpace';
  }
}

export function FacilitySection({
  facility,
  facilityData,
  isLoadingUnits,
  canManage,
  onEdit,
  onToggleActive,
  onArchive,
  onRestore,
  onDelete,
  searchQuery = '',
  activeFilter = 'all',
}: FacilitySectionProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';

  const [collapsed, setCollapsed] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<HousingUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addUnitsOpen, setAddUnitsOpen] = useState(false);

  const units = facilityData?.units || [];
  const occupants = facilityData?.occupants || [];
  const occupiedCount = facilityData?.occupiedCount || 0;
  const totalCount = facilityData?.totalCount || 0;

  const config = SUBDIVISION_CONFIG[facility.facility_type];
  const isOpenArea = facility.facility_type === 'paddock' || facility.facility_type === 'pasture';
  const isActivityType = facility.facility_type === 'arena' || facility.facility_type === 'round_pen' || facility.facility_type === 'wash_area';
  const isHousingType = !isOpenArea && !isActivityType && (config?.supportsChildren ?? true);

  // Filter units based on search + filter
  const filteredUnits = useMemo(() => {
    if (!isHousingType) return units;
    return units.filter(unit => {
      // Search matching
      if (searchQuery && facilityData && !unitMatchesSearch(unit, facilityData, searchQuery)) return false;
      // Filter matching
      if (activeFilter === 'all') return true;
      const unitOccupants = occupants.filter(o => o.unit_id === unit.id);
      const isOcc = unitOccupants.length > 0;
      const isFull = unitOccupants.length >= unit.capacity;
      switch (activeFilter) {
        case 'vacant': return !isOcc && unit.status === 'available';
        case 'occupied': return isOcc && !isFull;
        case 'full': return isFull;
        case 'isolation': return unit.unit_type === 'isolation_room' || unit.unit_type === 'isolation_bay';
        case 'maintenance': return unit.status === 'maintenance';
        case 'out_of_service': return unit.status === 'out_of_service';
        default: return true;
      }
    });
  }, [units, searchQuery, activeFilter, occupants, facilityData, isHousingType]);

  // Compute vacancy for header
  const vacantCount = useMemo(() => {
    return units.filter(u => {
      if (u.status !== 'available') return false;
      return !occupants.some(o => o.unit_id === u.id);
    }).length;
  }, [units, occupants]);

  // Hide entire facility if search/filter yields no units (only for housing types)
  const hasVisibleContent = !isHousingType || filteredUnits.length > 0 || (!searchQuery && activeFilter === 'all');

  // Pressure indicator: > 85% occupied
  const occupancyRatio = totalCount > 0 ? occupiedCount / totalCount : 0;
  const isHighPressure = occupancyRatio >= 0.85 && totalCount > 0;

  // Account-aware type label
  const getTypeLabel = useCallback(() => {
    if (facility.facility_type === 'barn') {
      if (isClinic) return lang === 'ar' ? 'عنبر' : 'Ward';
      return lang === 'ar' ? 'جناح' : 'Stall Block';
    }
    return t(`housing.facilityTypes.${facility.facility_type}`);
  }, [facility.facility_type, isClinic, lang, t]);

  const handleUnitClick = (inlineUnit: InlineUnit) => {
    const unitOccupants = occupants.filter(o => o.unit_id === inlineUnit.id);
    const housingUnit: HousingUnit = {
      id: inlineUnit.id,
      tenant_id: facility.tenant_id,
      branch_id: facility.branch_id,
      stable_id: null,
      area_id: inlineUnit.area_id,
      code: inlineUnit.code,
      name: inlineUnit.name,
      name_ar: inlineUnit.name_ar,
      unit_type: inlineUnit.unit_type,
      occupancy: inlineUnit.occupancy as 'single' | 'group',
      capacity: inlineUnit.capacity,
      status: inlineUnit.status,
      is_active: inlineUnit.is_active,
      is_archived: false,
      is_demo: false,
      notes: null,
      created_at: '',
      updated_at: null,
      area: { id: facility.id, name: facility.name },
      current_occupants: unitOccupants.length,
    };
    setSelectedUnit(housingUnit);
    setDetailsOpen(true);
  };

  // Lifecycle action handlers
  // Query admission count for this facility
  const { data: facilityAdmissionCount = 0 } = useQuery({
    queryKey: ['facility-admission-count', facility.id, facility.tenant_id],
    queryFn: async () => {
      const { count } = await supabase
        .from('boarding_admissions')
        .select('id', { count: 'exact', head: true })
        .eq('area_id', facility.id)
        .eq('tenant_id', facility.tenant_id);
      return count || 0;
    },
    enabled: !!facility.id,
  });

  const deleteBlockers = useMemo(() => {
    const blockers: { reason: string; count?: number }[] = [];
    if (totalCount > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasUnits' as any).replace('{n}', String(totalCount)), count: totalCount });
    }
    if (occupiedCount > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasOccupants' as any) });
    }
    if (facilityAdmissionCount > 0) {
      blockers.push({ reason: t('housing.lifecycle.blockers.hasAdmissions' as any), count: facilityAdmissionCount });
    }
    return blockers;
  }, [totalCount, occupiedCount, facilityAdmissionCount, t]);

  if (!hasVisibleContent) return null;

  return (
    <>
      <div className="rounded-xl border bg-card">
        {/* Facility Summary Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30 rounded-t-xl">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {(() => { const FIcon = FACILITY_TYPE_ICONS[facility.facility_type] || Building2; return <FIcon className="w-4.5 h-4.5 text-primary" />; })()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BilingualName
                name={facility.name}
                nameAr={facility.name_ar}
                primaryClassName="text-sm font-semibold"
                secondaryClassName="text-xs"
              />
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {getTypeLabel()}
              </Badge>
              <LifecycleStateBadge isActive={facility.is_active} isArchived={facility.is_archived} />
            </div>
            {facility.code && (
              <span className="text-xs text-muted-foreground">{facility.code}</span>
            )}
          </div>

          {/* Occupancy + vacancy — only for housing types with units */}
          <div className="flex items-center gap-3 shrink-0">
            {isHousingType && totalCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className={cn("text-sm font-semibold tabular-nums", isHighPressure && "text-amber-600")}>
                    {occupiedCount}/{totalCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-none">
                    {t('housing.facilities.occupancy')}
                  </div>
                </div>
                {vacantCount > 0 && (
                  <div className="text-center">
                    <div className="text-sm font-semibold text-emerald-600 tabular-nums">
                      {vacantCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-none">
                      {t('housing.vacancy.vacant')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Management actions */}
            {canManage && (
              <div className="flex items-center gap-1">
                {isHousingType && facility.is_active && !facility.is_archived && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddUnitsOpen(true)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('housing.create.addUnitsTooltip')}</TooltipContent>
                  </Tooltip>
                )}
                {!facility.is_archived && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(facility.id)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('housing.facilities.editTooltip')}</TooltipContent>
                  </Tooltip>
                )}
                <LifecycleActionMenu
                  entityType="facility"
                  isActive={facility.is_active}
                  isArchived={facility.is_archived}
                  canDelete={deleteBlockers.length === 0}
                  deleteBlockers={deleteBlockers}
                  onDelete={async () => { await onDelete(facility.id); }}
                  onArchive={async () => { await onArchive(facility.id); }}
                  onDeactivate={async () => { await onToggleActive({ id: facility.id, isActive: false }); }}
                  onReactivate={async () => { await onToggleActive({ id: facility.id, isActive: true }); }}
                  onRestore={async () => { await onRestore(facility.id); }}
                />
              </div>
            )}

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Content area */}
        {!collapsed && (
          <div className="p-3">
            {isOpenArea ? (
              <OpenAreaContent facility={facility} />
            ) : isActivityType ? (
              <ActivityContent facility={facility} />
            ) : isHousingType ? (
              isLoadingUnits ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <LayoutGrid className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">{t('housing.units.noUnits')}</p>
                  {canManage && facility.is_active && !facility.is_archived && (
                    <Button variant="link" size="sm" className="mt-1" onClick={() => setAddUnitsOpen(true)}>
                      <Plus className="w-3 h-3 me-1" />
                      {t('housing.create.addUnitsSubmit')}
                    </Button>
                  )}
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t('housing.search.noResults')}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
                  {filteredUnits.map((unit) => (
                    <UnitCell
                      key={unit.id}
                      unit={unit}
                      occupants={occupants}
                      onClick={handleUnitClick}
                      highlighted={!!searchQuery}
                    />
                  ))}
                </div>
              )
            ) : (
              <NonHousingContent facilityType={facility.facility_type} />
            )}
          </div>
        )}
      </div>

      <UnitDetailsSheet unit={selectedUnit} open={detailsOpen} onOpenChange={setDetailsOpen} />

      {isHousingType && (
        <AddUnitsDialog open={addUnitsOpen} onOpenChange={setAddUnitsOpen} facility={facility} existingUnitCount={totalCount} />
      )}
    </>
  );
}

function NonHousingContent({ facilityType }: { facilityType: FacilityType }) {
  const { t } = useI18n();
  const Icon = FACILITY_TYPE_ICONS[facilityType] || Building2;
  
  return (
    <div className="flex items-center gap-3 py-4 px-3 text-muted-foreground">
      <Icon className="w-6 h-6 opacity-40 shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground/80">{t(getNonHousingLabelKey(facilityType))}</p>
        <p className="text-xs">{t(getNonHousingDescKey(facilityType))}</p>
      </div>
    </div>
  );
}
