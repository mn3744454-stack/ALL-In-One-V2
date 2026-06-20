import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Building2, Plus, ExternalLink } from "lucide-react";
import { BilingualName } from "@/components/ui/BilingualName";
import { HorseLifecycleChip } from "@/components/horses/HorseLifecycleChip";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useLocations } from "@/hooks/movement/useLocations";
import { useInternalMove } from "@/hooks/housing/useInternalMove";
import { displayLocationName } from "@/lib/displayHelpers";
import type { HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import { getAdmissionHorseDisplay } from "@/lib/housing/admissionDisplay";
import type { BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { CreateFacilityDialog, FACILITY_CATEGORY } from "./CreateFacilityDialog";
import { AddUnitsDialog } from "./AddUnitsDialog";
import type { FacilityArea } from "@/hooks/housing/useFacilityAreas";

interface PlaceInUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url?: string | null;
    lifecycle?: HorseLifecycleState;
  } | null;
  /** The branch the horse is currently at (= horses.current_location_id). */
  branchId: string | null | undefined;
  /**
   * Phase 1.e.f.7.b — Optional existing admission context. When provided
   * (e.g. row-level Needs Placement CTA), the dialog uses this admission as
   * the source of truth and skips the horse-id active-admission lookup.
   * Required for connected B2B recipient admissions where the canonical
   * horses row is not visible to the recipient tenant via RLS.
   */
  admission?: BoardingAdmission | null;
  onSuccess?: () => void;
}

/**
 * Pass 2-E — Frontend-only dialog that converts a Needs Placement horse into a
 * placed horse by reusing useInternalMove with fromUnitId=null/fromAreaId=null.
 * Does not create a new admission, does not edit historical movements.
 */
export function PlaceInUnitDialog({
  open,
  onOpenChange,
  horse,
  branchId,
  admission: providedAdmission,
  onSuccess,
}: PlaceInUnitDialogProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { activeLocations } = useLocations();
  // Phase 1.e.f.7.b — when a full admission is provided, prefer its branch_id
  // (recipient context). Falls back to the legacy branchId prop for callers
  // that still pass horse-only.
  const effectiveBranchId = providedAdmission?.branch_id ?? branchId ?? undefined;
  const { activeAreas, isLoading: areasLoading } = useFacilityAreas(effectiveBranchId || undefined);
  const { activeUnits, isLoading: unitsLoading } = useHousingUnits(effectiveBranchId || undefined);
  const { moveHorse, isMoving } = useInternalMove();

  const [areaId, setAreaId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");

  // Phase 1.e.f.7.b.2 — Quick Add nested dialog state. Lets the user create a
  // facility or units inline without leaving the placement flow.
  const [quickAddFacilityOpen, setQuickAddFacilityOpen] = useState(false);
  const [quickAddUnitsOpen, setQuickAddUnitsOpen] = useState(false);
  const [quickAddTargetFacilityId, setQuickAddTargetFacilityId] = useState<string>("");
  // Pre-creation snapshots of facility/unit ids — diffed after invalidation to
  // detect a newly created area/unit and auto-select it when unambiguous.
  const preCreateAreaIdsRef = useRef<Set<string> | null>(null);
  const preCreateUnitIdsRef = useRef<Set<string> | null>(null);

  // Phase 1.e.f.7.b — admission identity. Prefer the provided admission
  // object; otherwise fall back to a horse-id lookup (legacy horse-centric
  // callers).
  const horseIdForLookup = providedAdmission?.horse_id ?? horse?.id ?? null;

  // Reset on open / horse change.
  useEffect(() => {
    if (open) {
      setAreaId("");
      setUnitId("");
    }
  }, [open, horseIdForLookup, providedAdmission?.id]);

  // Resolve the horse's active admission only when no admission was provided.
  // Required for useInternalMove on legacy horse-only callers.
  const { data: fetchedAdmission, isLoading: admissionLoading } = useQuery({
    queryKey: ["place-in-unit-active-admission", tenantId, horse?.id],
    enabled: open && !providedAdmission && !!tenantId && !!horse?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_admissions")
        .select("id, branch_id, area_id, unit_id, status, horse_id")
        .eq("tenant_id", tenantId!)
        .eq("horse_id", horse!.id)
        .in("status", ["active", "checkout_pending"])
        .order("admitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Normalized admission used by the rest of the dialog. Provided admission
  // wins over the fetched fallback.
  const admission = providedAdmission
    ? {
        id: providedAdmission.id,
        branch_id: providedAdmission.branch_id,
        horse_id: providedAdmission.horse_id,
      }
    : fetchedAdmission;

  // Resolve display identity: canonical horse prop, or admission snapshot
  // fallback (Phase 1.e.f.7.a). Connected B2B recipient admissions have no
  // visible canonical horse row, so snapshot is the only label available.
  const displayIdentity = providedAdmission
    ? (() => {
        const d = getAdmissionHorseDisplay(providedAdmission);
        return {
          name: horse?.name ?? d.name ?? "",
          name_ar: horse?.name_ar ?? d.nameAr ?? null,
          avatar_url: horse?.avatar_url ?? d.avatarUrl ?? null,
        };
      })()
    : horse
      ? { name: horse.name, name_ar: horse.name_ar, avatar_url: horse.avatar_url ?? null }
      : null;

  const branch = activeLocations.find((l) => l.id === effectiveBranchId);

  const filteredAreas = useMemo(
    () => activeAreas.filter((a) => a.branch_id === effectiveBranchId),
    [activeAreas, effectiveBranchId]
  );

  const unitsForArea = useMemo(
    () =>
      activeUnits.filter(
        (u) =>
          u.branch_id === effectiveBranchId &&
          u.area_id === areaId &&
          u.status !== "maintenance" &&
          u.status !== "out_of_service"
      ),
    [activeUnits, effectiveBranchId, areaId]
  );

  const totalUnitsInBranch = useMemo(
    () =>
      activeUnits.filter(
        (u) =>
          u.branch_id === effectiveBranchId &&
          u.status !== "maintenance" &&
          u.status !== "out_of_service" &&
          (u.current_occupants ?? 0) < u.capacity
      ).length,
    [activeUnits, effectiveBranchId]
  );

  // Phase 1.e.f.7.b.2 — facilities in this branch that can actually hold housing
  // units (excludes open_area / activity / storage categories so Quick Add does
  // not produce another dead-end).
  const housingFacilitiesInBranch = useMemo(
    () => filteredAreas.filter((a) => FACILITY_CATEGORY[a.facility_type] === "housing"),
    [filteredAreas]
  );

  // Default the Add Units target to the first housing facility in the branch,
  // or follow the user's explicit pick.
  const effectiveQuickAddFacility: FacilityArea | null = useMemo(() => {
    if (quickAddTargetFacilityId) {
      return housingFacilitiesInBranch.find((f) => f.id === quickAddTargetFacilityId) ?? null;
    }
    return housingFacilitiesInBranch[0] ?? null;
  }, [housingFacilitiesInBranch, quickAddTargetFacilityId]);

  const existingUnitCountForTarget = useMemo(() => {
    if (!effectiveQuickAddFacility) return 0;
    return activeUnits.filter((u) => u.area_id === effectiveQuickAddFacility.id).length;
  }, [activeUnits, effectiveQuickAddFacility]);

  // Phase 1.e.f.7.b.2 — auto-select newly created area/unit after Quick Add.
  // Diff current ids against the pre-creation snapshot; if exactly one new
  // eligible row exists, select it. Never auto-confirm placement.
  useEffect(() => {
    if (!preCreateAreaIdsRef.current) return;
    if (areaId) return; // user already chose something
    const prev = preCreateAreaIdsRef.current;
    const newAreas = housingFacilitiesInBranch.filter((a) => !prev.has(a.id));
    if (newAreas.length === 1) {
      setAreaId(newAreas[0].id);
      preCreateAreaIdsRef.current = null;
    }
  }, [housingFacilitiesInBranch, areaId]);

  useEffect(() => {
    if (!preCreateUnitIdsRef.current) return;
    if (!areaId || unitId) return;
    const prev = preCreateUnitIdsRef.current;
    const newAvailableUnits = activeUnits.filter(
      (u) =>
        u.area_id === areaId &&
        u.status !== "maintenance" &&
        u.status !== "out_of_service" &&
        (u.current_occupants ?? 0) < u.capacity &&
        !prev.has(u.id)
    );
    if (newAvailableUnits.length === 1) {
      setUnitId(newAvailableUnits[0].id);
      preCreateUnitIdsRef.current = null;
    }
  }, [activeUnits, areaId, unitId]);


  const selectedUnit = unitsForArea.find((u) => u.id === unitId);
  const isUnitFull =
    !!selectedUnit && (selectedUnit.current_occupants ?? 0) >= selectedUnit.capacity;

  const canConfirm =
    !!admission &&
    !!effectiveBranchId &&
    !!areaId &&
    !!unitId &&
    !isUnitFull &&
    !isMoving;

  const dirtySnapshot = useMemo(() => ({ areaId, unitId }), [areaId, unitId]);
  const { isDirty, resetBaseline } = useDirtyForm(dirtySnapshot, open);

  const handleConfirm = async () => {
    if (!admission || !effectiveBranchId || !areaId || !unitId) return;
    try {
      await moveHorse({
        horseId: admission.horse_id,
        admissionId: admission.id,
        // Phase 1.e.f.7.e.1 — pass real from-unit/from-area when the
        // admission already has one so unit-to-unit moves record an
        // accurate movement row. Initial placement (admission has no
        // unit yet) still passes null on both, preserving the legacy
        // first-placement path.
        fromUnitId: (admission as any)?.unit_id ?? null,
        fromAreaId: (admission as any)?.area_id ?? null,
        toUnitId: unitId,
        toAreaId: areaId,
        toBranchId: effectiveBranchId,
      });
      // Clear baseline so the post-success close does not trigger discard confirm.
      resetBaseline({ areaId: "", unitId: "" });
      onSuccess?.();

      onOpenChange(false);
    } catch {
      /* error toast handled inside useInternalMove */
    }
  };

  const handleOpenChange = (next: boolean) => {
    // Block close paths while a placement mutation is in-flight.
    if (!next && isMoving) return;
    onOpenChange(next);
  };

  const branchLabel = branch
    ? displayLocationName(branch.name, (branch as any).name_ar ?? null, branch.city, lang)
    : "—";

  return (
    <>
    <SafeFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      isDirty={isDirty && !isMoving}
      className="sm:max-w-lg"
    >

        <DialogHeader>
          <DialogTitle>{t("housing.branchScope.placeInUnitDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("housing.branchScope.placeInUnitDialogDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Horse + branch context */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {displayIdentity && (displayIdentity.name || displayIdentity.name_ar) && (
              <BilingualName
                name={displayIdentity.name}
                nameAr={displayIdentity.name_ar}
                primaryClassName="font-medium text-sm"
                secondaryClassName="text-xs"
              />
            )}
            {horse?.lifecycle && (
              <HorseLifecycleChip state={horse.lifecycle} hideUnknown size="xs" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground/70">
              {t("housing.branchScope.placeInUnitCurrentBranch")}:
            </span>
            <span>{branchLabel}</span>
          </div>
        </div>

        {/* Loading / error / no-admission / no-units states */}
        {admissionLoading || areasLoading || unitsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !admission ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("housing.branchScope.placeInUnitNoAdmission")}
            </AlertDescription>
          </Alert>
        ) : totalUnitsInBranch === 0 ? (
          /* Phase 1.e.f.7.b.2 — Quick Add continuity empty state. Branches on
             whether the current branch has any housing facility yet. */
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {housingFacilitiesInBranch.length === 0
                  ? t("housing.branchScope.placeInUnitNoFacility")
                  : t("housing.branchScope.placeInUnitNoUnitsInFacility")}
              </AlertDescription>
            </Alert>

            {housingFacilitiesInBranch.length === 0 ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  preCreateAreaIdsRef.current = new Set(housingFacilitiesInBranch.map((a) => a.id));
                  preCreateUnitIdsRef.current = new Set(activeUnits.map((u) => u.id));
                  setQuickAddFacilityOpen(true);
                }}
              >
                <Plus className="h-4 w-4 me-1.5" />
                {t("housing.branchScope.placeInUnitAddFacility")}
              </Button>
            ) : (
              <div className="space-y-2">
                {housingFacilitiesInBranch.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      {t("housing.branchScope.placeInUnitPickFacility")}
                    </label>
                    <Select
                      value={effectiveQuickAddFacility?.id ?? ""}
                      onValueChange={setQuickAddTargetFacilityId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {housingFacilitiesInBranch.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <BilingualName
                              name={f.name}
                              nameAr={f.name_ar}
                              inline
                              primaryClassName="text-sm"
                              secondaryClassName="text-xs"
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full"
                  disabled={!effectiveQuickAddFacility}
                  onClick={() => {
                    preCreateUnitIdsRef.current = new Set(activeUnits.map((u) => u.id));
                    setQuickAddUnitsOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 me-1.5" />
                  {t("housing.branchScope.placeInUnitAddUnits")}
                </Button>
              </div>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full text-xs">
              <Link
                to={`/dashboard/housing?tab=facilities${
                  effectiveBranchId ? `&branch=${effectiveBranchId}` : ""
                }`}
                onClick={() => handleOpenChange(false)}
              >
                <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                {t("housing.branchScope.placeInUnitOpenFacilities")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">

            {/* Area selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("housing.branchScope.placeInUnitArea")}
              </label>
              <Select
                value={areaId}
                onValueChange={(v) => {
                  setAreaId(v);
                  setUnitId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("housing.branchScope.placeInUnitSelectArea")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredAreas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <BilingualName
                        name={a.name}
                        nameAr={a.name_ar}
                        inline
                        primaryClassName="text-sm"
                        secondaryClassName="text-xs"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("housing.branchScope.placeInUnitUnit")}
              </label>
              <Select value={unitId} onValueChange={setUnitId} disabled={!areaId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("housing.branchScope.placeInUnitSelectUnit")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {unitsForArea.map((u) => {
                    const occ = u.current_occupants ?? 0;
                    const full = occ >= u.capacity;
                    return (
                      <SelectItem key={u.id} value={u.id} disabled={full}>
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{u.code}</span>
                          {u.name && u.name !== u.code && (
                            <span className="text-xs text-muted-foreground">
                              · {u.name}
                            </span>
                          )}
                          <Badge
                            variant={full ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {full
                              ? t("housing.branchScope.placeInUnitFull")
                              : `${occ}/${u.capacity}`}
                          </Badge>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isMoving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isMoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("common.confirm")
            )}
          </Button>
        </DialogFooter>
    </SafeFormDialog>

    {/* Phase 1.e.f.7.b.2 — Quick Add nested dialogs. Sibling-rendered so that
        canceling them does NOT close PlaceInUnitDialog. SafeFormDialog
        already blocks outside-click close and gates discard on dirty state. */}
    {quickAddFacilityOpen && (
      <CreateFacilityDialog
        open={quickAddFacilityOpen}
        onOpenChange={setQuickAddFacilityOpen}
        lockedBranchId={effectiveBranchId}
        effectiveBranchId={effectiveBranchId}
      />
    )}
    {quickAddUnitsOpen && effectiveQuickAddFacility && (
      <AddUnitsDialog
        open={quickAddUnitsOpen}
        onOpenChange={setQuickAddUnitsOpen}
        facility={effectiveQuickAddFacility}
        existingUnitCount={existingUnitCountForTarget}
      />
    )}
    </>
  );
}


