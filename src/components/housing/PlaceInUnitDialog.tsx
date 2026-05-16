import { useEffect, useMemo, useState } from "react";
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
import { Loader2, AlertCircle, Building2 } from "lucide-react";
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
  onSuccess,
}: PlaceInUnitDialogProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { activeLocations } = useLocations();
  const { activeAreas, isLoading: areasLoading } = useFacilityAreas(branchId || undefined);
  const { activeUnits, isLoading: unitsLoading } = useHousingUnits(branchId || undefined);
  const { moveHorse, isMoving } = useInternalMove();

  const [areaId, setAreaId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");

  // Reset on open / horse change.
  useEffect(() => {
    if (open) {
      setAreaId("");
      setUnitId("");
    }
  }, [open, horse?.id]);

  // Resolve the horse's active admission. Required for useInternalMove.
  const { data: admission, isLoading: admissionLoading } = useQuery({
    queryKey: ["place-in-unit-active-admission", tenantId, horse?.id],
    enabled: open && !!tenantId && !!horse?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_admissions")
        .select("id, branch_id, area_id, unit_id, status")
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

  const branch = activeLocations.find((l) => l.id === branchId);

  const filteredAreas = useMemo(
    () => activeAreas.filter((a) => a.branch_id === branchId),
    [activeAreas, branchId]
  );

  const unitsForArea = useMemo(
    () =>
      activeUnits.filter(
        (u) =>
          u.branch_id === branchId &&
          u.area_id === areaId &&
          u.status !== "maintenance" &&
          u.status !== "out_of_service"
      ),
    [activeUnits, branchId, areaId]
  );

  const totalUnitsInBranch = useMemo(
    () =>
      activeUnits.filter(
        (u) =>
          u.branch_id === branchId &&
          u.status !== "maintenance" &&
          u.status !== "out_of_service" &&
          (u.current_occupants ?? 0) < u.capacity
      ).length,
    [activeUnits, branchId]
  );

  const selectedUnit = unitsForArea.find((u) => u.id === unitId);
  const isUnitFull =
    !!selectedUnit && (selectedUnit.current_occupants ?? 0) >= selectedUnit.capacity;

  const canConfirm =
    !!horse &&
    !!branchId &&
    !!admission &&
    !!areaId &&
    !!unitId &&
    !isUnitFull &&
    !isMoving;

  const dirtySnapshot = useMemo(() => ({ areaId, unitId }), [areaId, unitId]);
  const { isDirty, resetBaseline } = useDirtyForm(dirtySnapshot, open);

  const handleConfirm = async () => {
    if (!horse || !branchId || !admission || !areaId || !unitId) return;
    try {
      await moveHorse({
        horseId: horse.id,
        admissionId: admission.id,
        fromUnitId: null,
        fromAreaId: null,
        toUnitId: unitId,
        toAreaId: areaId,
        toBranchId: branchId,
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
            {horse && (
              <BilingualName
                name={horse.name}
                nameAr={horse.name_ar}
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("housing.branchScope.placeInUnitNoUnits")}
            </AlertDescription>
          </Alert>
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
  );
}

