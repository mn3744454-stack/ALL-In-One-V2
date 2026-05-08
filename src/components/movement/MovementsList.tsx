import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { MovementCard } from "./MovementCard";
import { MovementDetailSheet } from "./MovementDetailSheet";
import { MovementFilters } from "./MovementFilters";
import { DispatchConfirmDialog } from "./DispatchConfirmDialog";
import { ConfirmArrivalDialog } from "./ConfirmArrivalDialog";
import { ConfirmTransferDialog } from "./ConfirmTransferDialog";
import { RecordMovementDialog } from "./RecordMovementDialog";
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
}

export function MovementsList({ onRecordMovement, typeFilter, statusFilter }: MovementsListProps) {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('movements');
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedMovement, setSelectedMovement] = useState<HorseMovement | null>(null);
  const [dispatchMovementId, setDispatchMovementId] = useState<string | null>(null);
  const [arrivalMovementId, setArrivalMovementId] = useState<string | null>(null);
  const [transferMovementId, setTransferMovementId] = useState<string | null>(null);
  const [returnPrefill, setReturnPrefill] = useState<{ horseId: string; movementType: MovementType; movementSubtype?: MovementSubtype } | null>(null);

  // When a parent tab enforces typeFilter/statusFilter, the local filter UI
  // is hidden — so preserving local filters here would silently apply
  // invisible constraints (date/search/location) and zero out results.
  // Derive a clean mergedFilters from the enforced props only in that case.
  const mergedFilters: FiltersType = (typeFilter || statusFilter)
    ? {
        ...(typeFilter ? { movementType: typeFilter } : {}),
        ...(statusFilter ? { movementStatus: statusFilter } : {}),
      }
    : filters;
  
  const {
    movements,
    isLoading,
    canManage,
    dispatchMovement,
    isDispatching,
    confirmLocalArrival,
    isConfirmingArrival,
    confirmInternalTransfer,
    isConfirmingTransfer,
  } = useHorseMovements(mergedFilters);
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
        lifecycleState={selectedMovement?.horse_id ? statesByHorseId.get(selectedMovement.horse_id) ?? null : null}
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
