import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { MovementCard } from "./MovementCard";
import { MovementDetailSheet } from "./MovementDetailSheet";
import { MovementFilters } from "./MovementFilters";
import { DispatchConfirmDialog } from "./DispatchConfirmDialog";
import { useI18n } from "@/i18n";
import { Plus, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useHorseMovements, type MovementFilters as FiltersType, type HorseMovement } from "@/hooks/movement/useHorseMovements";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseActiveAdmission } from "@/hooks/housing/useHorseActiveAdmission";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useNotificationDeepLink } from "@/hooks/useNotificationDeepLink";

interface MovementsListProps {
  onRecordMovement: () => void;
  typeFilter?: 'in' | 'out' | 'transfer';
  statusFilter?: 'scheduled' | 'dispatched' | 'completed' | 'cancelled';
}

export function MovementsList({ onRecordMovement, typeFilter, statusFilter }: MovementsListProps) {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('movements');
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedMovement, setSelectedMovement] = useState<HorseMovement | null>(null);
  const [dispatchMovementId, setDispatchMovementId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Merge external filters with user filters
  const mergedFilters: FiltersType = {
    ...filters,
    ...(typeFilter ? { movementType: typeFilter } : {}),
    ...(statusFilter ? { movementStatus: statusFilter } : {}),
  };
  
  const { movements, isLoading, canManage, dispatchMovement, isDispatching } = useHorseMovements(mergedFilters);
  const { locations } = useLocations();

  const dispatchMovement_ = dispatchMovementId
    ? movements.find(m => m.id === dispatchMovementId)
    : null;
  const dispatchHorseId = dispatchMovement_?.horse_id || null;

  const { data: activeAdmission } = useHorseActiveAdmission(dispatchHorseId);

  // Phase 2: open-on-arrival from notification deep-links.
  // Reads ?movementId=… (set by notification routeDescriptor), opens the
  // detail sheet, then strips the param so back-nav doesn't re-trigger.
  useEffect(() => {
    const movementId = searchParams.get('movementId');
    if (!movementId || isLoading || movements.length === 0) return;
    const found = movements.find((m) => m.id === movementId);
    if (!found) return;
    setSelectedMovement(found);
    const next = new URLSearchParams(searchParams);
    next.delete('movementId');
    next.delete('entityType');
    next.delete('entityId');
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [searchParams, isLoading, movements, setSearchParams]);

  const handleDispatch = (movementId: string) => {
    setDispatchMovementId(movementId);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchMovementId) return;
    await dispatchMovement({ movementId: dispatchMovementId });
    setDispatchMovementId(null);
    setSelectedMovement(null);
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
            />
          ))}
        </div>
      )}

      <MovementDetailSheet
        movement={selectedMovement}
        open={!!selectedMovement}
        onOpenChange={(open) => { if (!open) setSelectedMovement(null); }}
        onDispatch={handleDispatch}
      />

      <DispatchConfirmDialog
        open={!!dispatchMovementId}
        onOpenChange={(open) => { if (!open) setDispatchMovementId(null); }}
        onConfirm={handleConfirmDispatch}
        isDispatching={isDispatching}
        admissionId={activeAdmission?.id || null}
        clientId={activeAdmission?.client_id || null}
      />
    </div>
  );
}
