import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MovementCard } from "./MovementCard";
import { MovementDetailSheet } from "./MovementDetailSheet";
import { MovementFilters } from "./MovementFilters";
import { DispatchConfirmDialog } from "./DispatchConfirmDialog";
import { ConfirmArrivalDialog } from "./ConfirmArrivalDialog";
import { ConfirmTransferDialog } from "./ConfirmTransferDialog";
import { RecordMovementDialog } from "./RecordMovementDialog";
import { AdmissionDetailSheet } from "@/components/housing/AdmissionDetailSheet";
import { classifyMovement } from "./movementClassification";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { Plus, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useHorseMovements, type MovementFilters as FiltersType, type HorseMovement, type MovementType, type MovementSubtype } from "@/hooks/movement/useHorseMovements";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseActiveAdmission } from "@/hooks/housing/useHorseActiveAdmission";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useNotificationDeepLink } from "@/hooks/useNotificationDeepLink";
import { useHorseLifecycleStates } from "@/hooks/movement/useHorseLifecycleStates";

interface MovementsListProps {
  onRecordMovement: () => void;
  typeFilter?: 'in' | 'out' | 'transfer';
  statusFilter?: 'scheduled' | 'dispatched' | 'completed' | 'cancelled' | Array<'scheduled' | 'dispatched' | 'completed' | 'cancelled'>;
  /**
   * AD-1 Pass 2-G: Housing branch scope. When set, the list is filtered to
   * movements relevant to this branch using `branchScopeSide`.
   */
  branchId?: string | null;
  /**
   * Branch-side rule:
   *  - 'any' (default when branchId set): from = B OR to = B (parent SQL OR)
   *  - 'from': only from_location_id = B (Departures)
   *  - 'to':   only to_location_id = B (Arrivals)
   *  - 'inter-branch': from = B OR to = B AND from <> to (true Transfers)
   */
  branchScopeSide?: 'any' | 'from' | 'to' | 'inter-branch';
}

export function MovementsList({ onRecordMovement, typeFilter, statusFilter, branchId, branchScopeSide = 'any' }: MovementsListProps) {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('movements');
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedMovement, setSelectedMovement] = useState<HorseMovement | null>(null);
  const [dispatchMovementId, setDispatchMovementId] = useState<string | null>(null);
  const [arrivalMovementId, setArrivalMovementId] = useState<string | null>(null);
  const [transferMovementId, setTransferMovementId] = useState<string | null>(null);
  const [returnPrefill, setReturnPrefill] = useState<{ horseId: string; movementType: MovementType; movementSubtype?: MovementSubtype } | null>(null);
  const [admissionDrawerId, setAdmissionDrawerId] = useState<string | null>(null);
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  // H3.1 — Best-effort admission link lookup for the currently-selected
  // movement. horse_movements has no direct admission_id FK, so we look up
  // the boarding admission for the same horse and pick the row whose
  // admitted_at (check-in) or checked_out_at (checkout) is closest to the
  // movement's movement_at. Only runs for admission check-in / checkout.
  const selectedClass = selectedMovement ? classifyMovement(selectedMovement) : null;
  const isAdmissionMovement = selectedClass === 'admission_checkin' || selectedClass === 'checkout_departure';
  // H5-C-A — FK-first admission link lookup. Prefer direct reverse-lookup
  // via boarding_admissions.checkin_movement_id / checkout_movement_id; fall
  // back to the H3.1 ±24h heuristic only when no direct link exists.
  const { data: linkedAdmission = { id: null, source: null } } = useQuery<{
    id: string | null;
    source: 'direct' | 'heuristic' | null;
  }>({
    queryKey: ['movement-linked-admission', tenantId, selectedMovement?.id, selectedMovement?.horse_id, isAdmissionMovement],
    queryFn: async () => {
      if (!tenantId || !selectedMovement?.horse_id || !isAdmissionMovement) {
        return { id: null, source: null };
      }
      // 1) Direct FK reverse-lookup.
      const { data: direct } = await supabase
        .from('boarding_admissions')
        .select('id')
        .eq('tenant_id', tenantId)
        .or(`checkin_movement_id.eq.${selectedMovement.id},checkout_movement_id.eq.${selectedMovement.id}`)
        .limit(1)
        .maybeSingle();
      if (direct?.id) return { id: direct.id, source: 'direct' };

      // 2) Heuristic fallback (preserved from H3.1).
      const { data } = await supabase
        .from('boarding_admissions')
        .select('id, admitted_at, checked_out_at')
        .eq('tenant_id', tenantId)
        .eq('horse_id', selectedMovement.horse_id)
        .order('admitted_at', { ascending: false })
        .limit(20);
      if (!data?.length) return { id: null, source: null };
      const movementMs = new Date(selectedMovement.movement_at).getTime();
      const isCheckin = selectedClass === 'admission_checkin';
      let best: { id: string; delta: number } | null = null;
      for (const row of data) {
        const ts = isCheckin ? row.admitted_at : (row.checked_out_at ?? row.admitted_at);
        if (!ts) continue;
        const delta = Math.abs(new Date(ts).getTime() - movementMs);
        if (delta > 24 * 60 * 60 * 1000) continue;
        if (!best || delta < best.delta) best = { id: row.id, delta };
      }
      return best ? { id: best.id, source: 'heuristic' } : { id: null, source: null };
    },
    enabled: !!tenantId && !!selectedMovement?.horse_id && isAdmissionMovement,
  });
  const linkedAdmissionId = linkedAdmission.id;
  const linkedAdmissionSource = linkedAdmission.source;

  // H4-A — When the parent Movement Detail sheet closes, also dismiss any
  // nested Admission Detail drawer opened from it. Closing the admission
  // drawer alone leaves the movement sheet underneath untouched.
  useEffect(() => {
    if (!selectedMovement) setAdmissionDrawerId(null);
  }, [selectedMovement]);

  // When a parent tab enforces typeFilter/statusFilter, the local filter UI
  // is hidden — so preserving local filters here would silently apply
  // invisible constraints (date/search/location) and zero out results.
  // Derive a clean mergedFilters from the enforced props only in that case.
  const mergedFilters: FiltersType = (typeFilter || statusFilter || branchId)
    ? {
        ...(typeFilter ? { movementType: typeFilter } : {}),
        ...(statusFilter ? { movementStatus: statusFilter } : {}),
        ...(branchId ? { locationId: branchId } : {}),
      }
    : filters;
  
  const {
    movements: rawMovements,
    isLoading,
    canManage,
    dispatchMovement,
    isDispatching,
    confirmLocalArrival,
    isConfirmingArrival,
    confirmInternalTransfer,
    isConfirmingTransfer,
  } = useHorseMovements(mergedFilters);

  // AD-1 Pass 2-G: client-side branch-side post-filter. The server `locationId`
  // filter is OR(from,to); here we narrow to one-sided or inter-branch as
  // required by the active sub-tab.
  const movements = (() => {
    if (!branchId) return rawMovements;
    switch (branchScopeSide) {
      case 'from':
        return rawMovements.filter(m => m.from_location_id === branchId);
      case 'to':
        return rawMovements.filter(m => m.to_location_id === branchId);
      case 'inter-branch':
        return rawMovements.filter(m =>
          (m.from_location_id === branchId || m.to_location_id === branchId)
          && m.from_location_id !== m.to_location_id
        );
      case 'any':
      default:
        return rawMovements;
    }
  })();
  const { locations } = useLocations();
  const { statesByHorseId } = useHorseLifecycleStates(movements.map(m => m.horse_id));

  const dispatchMovement_ = dispatchMovementId
    ? movements.find(m => m.id === dispatchMovementId)
    : null;
  const dispatchHorseId = dispatchMovement_?.horse_id || null;

  const { data: activeAdmission } = useHorseActiveAdmission(dispatchHorseId);

  const arrivalMovement = arrivalMovementId
    ? movements.find(m => m.id === arrivalMovementId)
    : null;

  const transferMovement = transferMovementId
    ? movements.find(m => m.id === transferMovementId)
    : null;

  // Phase 2 corrective: open-on-arrival via the shared deep-link hook.
  const handleDeepLinkFound = useCallback(
    (m: HorseMovement) => setSelectedMovement(m),
    []
  );
  useNotificationDeepLink<HorseMovement>({
    paramKey: "movementId",
    isLoading,
    items: movements,
    getId: (m) => m.id,
    onFound: handleDeepLinkFound,
  });

  const handleDispatch = (movementId: string) => {
    setDispatchMovementId(movementId);
  };

  const handleConfirmArrival = (movementId: string) => {
    setArrivalMovementId(movementId);
  };

  const handleConfirmTransfer = (movementId: string) => {
    setTransferMovementId(movementId);
  };

  const handleRecordReturn = (horseId: string) => {
    setReturnPrefill({
      horseId,
      movementType: 'in',
      movementSubtype: 'return_from_temporary_out',
    });
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchMovementId) return;
    await dispatchMovement({ movementId: dispatchMovementId });
    setDispatchMovementId(null);
    setSelectedMovement(null);
  };

  const handleConfirmArrivalSubmit = async () => {
    if (!arrivalMovement) return;
    try {
      await confirmLocalArrival({
        movementId: arrivalMovement.id,
        currentStatus: arrivalMovement.movement_status,
      });
      setArrivalMovementId(null);
      setSelectedMovement(null);
    } catch {
      // Error toast (incl. half-failure) is handled inside the mutation.
      // Close the dialog so the user sees the refreshed state and can retry.
      setArrivalMovementId(null);
    }
  };

  const handleConfirmTransferSubmit = async () => {
    if (!transferMovement) return;
    try {
      await confirmInternalTransfer({
        movementId: transferMovement.id,
        currentStatus: transferMovement.movement_status,
      });
      setTransferMovementId(null);
      setSelectedMovement(null);
    } catch {
      // Toast (incl. half-failure) handled inside mutation. Close dialog so
      // the user sees the refreshed state and can retry from the card.
      setTransferMovementId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Primary Action */}
      <div className="flex items-center gap-2">
        {!typeFilter && !statusFilter && (
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("movement.filters.searchPlaceholder")}
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="ps-9"
            />
          </div>
        )}
        {!typeFilter && !statusFilter && !canManage && <div className="flex-1" />}
        {canManage && (
          <Button onClick={onRecordMovement} className="shrink-0">
            <Plus className="h-4 w-4 me-2" />
            {t("movement.form.recordMovement")}
          </Button>
        )}
      </div>

      {/* Row 2: Date chips + Dropdown filters + View Switcher */}
      {!typeFilter && !statusFilter && (
        <MovementFilters
          filters={filters}
          onFiltersChange={setFilters}
          locations={locations}
          viewSwitcher={
            <div className="hidden md:block shrink-0">
              <ViewSwitcher
                viewMode={viewMode}
                gridColumns={gridColumns}
                onViewModeChange={setViewMode}
                onGridColumnsChange={setGridColumns}
                showTable={false}
              />
            </div>
          }
        />
      )}

      {movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">{t("movement.list.noMovements")}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {t("movement.list.recordFirst")}
          </p>
          {canManage && (
            <Button onClick={onRecordMovement}>
              <Plus className="h-4 w-4 me-2" />
              {t("movement.form.recordMovement")}
            </Button>
          )}
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {movements.map((movement) => (
            <MovementCard
              key={movement.id}
              movement={movement}
              onClick={() => setSelectedMovement(movement)}
              onDispatch={handleDispatch}
              onConfirmArrival={handleConfirmArrival}
              onConfirmTransfer={handleConfirmTransfer}
              lifecycleState={movement.horse_id ? statesByHorseId.get(movement.horse_id) ?? null : null}
            />
          ))}
        </div>
      )}

      <MovementDetailSheet
        movement={selectedMovement}
        open={!!selectedMovement}
        onOpenChange={(open) => { if (!open) setSelectedMovement(null); }}
        onDispatch={handleDispatch}
        onConfirmArrival={handleConfirmArrival}
        onConfirmTransfer={handleConfirmTransfer}
        onRecordReturn={(horseId) => { setSelectedMovement(null); handleRecordReturn(horseId); }}
        onViewAdmission={(id) => setAdmissionDrawerId(id)}
        linkedAdmissionId={linkedAdmissionId}
        linkedAdmissionSource={linkedAdmissionSource}
        lifecycleState={selectedMovement?.horse_id ? statesByHorseId.get(selectedMovement.horse_id) ?? null : null}
      />

      <AdmissionDetailSheet
        admissionId={admissionDrawerId}
        open={!!admissionDrawerId}
        onOpenChange={(open) => { if (!open) setAdmissionDrawerId(null); }}
      />

      <RecordMovementDialog
        open={!!returnPrefill}
        onOpenChange={(open) => { if (!open) setReturnPrefill(null); }}
        prefill={returnPrefill}
      />

      <DispatchConfirmDialog
        open={!!dispatchMovementId}
        onOpenChange={(open) => { if (!open) setDispatchMovementId(null); }}
        onConfirm={handleConfirmDispatch}
        isDispatching={isDispatching}
        admissionId={activeAdmission?.id || null}
        clientId={activeAdmission?.client_id || null}
      />

      <ConfirmArrivalDialog
        open={!!arrivalMovementId}
        onOpenChange={(open) => { if (!open) setArrivalMovementId(null); }}
        onConfirm={handleConfirmArrivalSubmit}
        isProcessing={isConfirmingArrival}
        isRetry={arrivalMovement?.movement_status === 'dispatched'}
        hasUnit={!!arrivalMovement?.to_unit_id}
      />

      <ConfirmTransferDialog
        open={!!transferMovementId}
        onOpenChange={(open) => { if (!open) setTransferMovementId(null); }}
        onConfirm={handleConfirmTransferSubmit}
        isProcessing={isConfirmingTransfer}
        isRetry={transferMovement?.movement_status === 'dispatched'}
        hasUnit={!!transferMovement?.to_unit_id}
      />
    </div>
  );
}
