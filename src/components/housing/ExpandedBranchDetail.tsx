import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart, DoorOpen, BarChart3, MapPin, Plus, Loader2, MoreVertical,
  Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useLocations } from "@/hooks/movement/useLocations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditBranchDialog } from "./EditBranchDialog";

interface Branch {
  id: string;
  name: string;
  name_ar?: string | null;
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
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { toggleLocationActive } = useLocations();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['expanded-branch-detail', tenantId, branch.id],
    queryFn: async () => {
      if (!tenantId) return null;

      const [facilitiesRes, unitsRes, occupantsRes, horsesRes, admissionsRes] = await Promise.all([
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
        supabase
          .from('boarding_admissions')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('branch_id', branch.id)
          .eq('status', 'active')
          .limit(1),
      ]);

      const facilities = facilitiesRes.data || [];
      const units = unitsRes.data || [];
      const occupants = occupantsRes.data || [];
      const horses = horsesRes.data || [];

      const unitToArea: Record<string, string> = {};
      units.forEach((u: any) => { if (u.area_id) unitToArea[u.id] = u.area_id; });

      const occupiedUnitIds = new Set(occupants.map((o: any) => o.unit_id));
      const horseToArea: Record<string, string> = {};
      occupants.forEach((o: any) => {
        const area = unitToArea[o.unit_id];
        if (area) horseToArea[o.horse_id] = area;
      });

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
        hasActiveAdmissions: (admissionsRes.data || []).length > 0,
      };
    },
    enabled: !!tenantId,
  });

  const horseName = (h: { name: string; name_ar: string | null }) =>
    lang === 'ar' && h.name_ar ? h.name_ar : h.name;

  const facilityDisplayName = (f: { name: string; name_ar: string | null }) =>
    lang === 'ar' && f.name_ar ? f.name_ar : f.name;

  // Deletion safety
  const deletionBlockers: string[] = [];
  if (data) {
    if (data.totalHorses > 0)
      deletionBlockers.push(t('housing.branchActions.blockHorses').replace('{n}', String(data.totalHorses)));
    if (data.facilities.length > 0)
      deletionBlockers.push(t('housing.branchActions.blockFacilities').replace('{n}', String(data.facilities.length)));
    if (data.hasActiveAdmissions)
      deletionBlockers.push(t('housing.branchActions.blockAdmissions'));
  }
  const canDelete = deletionBlockers.length === 0;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await toggleLocationActive({ id: branch.id, isActive: false });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
      toast.success(t('housing.branchActions.deleted'));
      setDeleteDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      {/* ── Branch metadata + actions ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {(branch.city || branch.address) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {[branch.city, branch.address].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onNavigateToTab && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => onNavigateToTab('facilities')}>
              <Plus className="h-3.5 w-3.5" />
              {t('housing.facilities.addFacility')}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5 me-2" />
                {t('housing.branchActions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 me-2" />
                {t('housing.branchActions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <StatCell icon={DoorOpen} label={t('housing.branchScope.facilities')} value={data.facilities.length} />
        <StatCell icon={Heart} label={t('housing.branchScope.horses')} value={data.totalHorses} />
        <StatCell
          icon={BarChart3}
          label={t('housing.branchScope.occupancy')}
          value={data.totalUnits > 0 ? `${data.occupiedUnits}/${data.totalUnits}` : '—'}
        />
        <div className="rounded-lg border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              vacantUnits > 0 ? "bg-primary/60" : data.totalUnits > 0 ? "bg-destructive" : "bg-muted-foreground/30"
            )} />
            <span className="text-[11px] text-muted-foreground">
              {data.totalUnits > 0
                ? `${vacantUnits} ${t('housing.branchScope.vacant')}`
                : t('housing.branchScope.noUnitsYet')}
            </span>
          </div>
          {data.totalUnits > 0 && <Progress value={occupancyPct} className="h-1.5" />}
        </div>
      </div>

      {/* ── Facilities Section ── */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
          <DoorOpen className="h-3.5 w-3.5" />
          {t('housing.branchScope.facilitiesSection')}
          <Badge variant="secondary" className="text-[10px] font-normal">{data.facilities.length}</Badge>
        </h4>

        {data.facilities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center">
            <p className="text-sm text-muted-foreground">{t('housing.branchScope.noFacilitiesYet')}</p>
            {onNavigateToTab && (
              <Button variant="link" size="sm" className="mt-1" onClick={() => onNavigateToTab('facilities')}>
                {t('housing.facilities.addFacility')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.facilities.map((facility) => {
              const fOccPct = facility.totalUnits > 0
                ? Math.round((facility.occupiedUnits / facility.totalUnits) * 100) : 0;

              return (
                <div key={facility.id} className="rounded-lg border bg-card p-3 space-y-2">
                  {/* Facility header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{facilityDisplayName(facility)}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {t(`housing.facilityTypes.${facility.facility_type}` as any)}
                      </Badge>
                    </div>
                    {facility.horses.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Heart className="h-3 w-3" />
                        {facility.horses.length}
                      </span>
                    )}
                  </div>

                  {/* Occupancy bar */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {facility.totalUnits > 0 ? (
                      <>
                        <span>{facility.occupiedUnits}/{facility.totalUnits} {t('housing.branchScope.unitsOccupied')}</span>
                        <Progress value={fOccPct} className="h-1 flex-1 max-w-20" />
                      </>
                    ) : (
                      <span>{t('housing.branchScope.noUnitsYet')}</span>
                    )}
                  </div>

                  {/* Horse names — ALWAYS VISIBLE */}
                  {facility.horses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                      {facility.horses.map((horse) => (
                        <Badge key={horse.id} variant="secondary" className="text-xs font-normal gap-1 py-0.5">
                          <Heart className="h-2.5 w-2.5 text-primary/70" />
                          {horseName(horse)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Unassigned Horses ── */}
      {data.unassignedHorses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2.5">
            <Heart className="h-3.5 w-3.5" />
            {t('housing.branchScope.unassignedHorses')}
            <Badge variant="secondary" className="text-[10px] font-normal">{data.unassignedHorses.length}</Badge>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.unassignedHorses.map((horse) => (
              <Badge key={horse.id} variant="outline" className="text-xs font-normal gap-1 py-0.5">
                <Heart className="h-2.5 w-2.5 text-muted-foreground" />
                {horseName(horse)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Dialog ── */}
      <EditBranchDialog branch={branch} open={editOpen} onOpenChange={setEditOpen} />

      {/* ── Delete Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {!canDelete && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {t('housing.branchActions.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {canDelete ? (
                  <p>{t('housing.branchActions.deleteConfirm').replace('{name}', branch.name)}</p>
                ) : (
                  <>
                    <p>{t('housing.branchActions.cannotDelete')}</p>
                    <ul className="list-disc ps-5 space-y-1 text-sm">
                      {deletionBlockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">{t('housing.branchActions.resolveFirst')}</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('housing.branchActions.delete')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
