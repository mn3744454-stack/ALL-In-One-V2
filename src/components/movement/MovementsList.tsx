import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MovementCard } from "./MovementCard";
import { MovementDetailSheet } from "./MovementDetailSheet";
import { MovementFilters } from "./MovementFilters";
import { DispatchConfirmDialog } from "./DispatchConfirmDialog";
import { useI18n } from "@/i18n";
import { Plus, Package } from "lucide-react";
import { useHorseMovements, type MovementFilters as FiltersType, type HorseMovement } from "@/hooks/movement/useHorseMovements";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseActiveAdmission } from "@/hooks/housing/useHorseActiveAdmission";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";

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
    <div className="space-y-4">
      {/* Only show full filters if no external filter is applied */}
      {!typeFilter && !statusFilter && (
        <MovementFilters
          filters={filters}
          onFiltersChange={setFilters}
          locations={locations}
        />
      )}

      <div className="flex items-center justify-between">
        {canManage && (
          <Button onClick={onRecordMovement} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 me-2" />
            {t("movement.form.recordMovement")}
          </Button>
        )}
        <div className="hidden md:block ms-auto">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable={false}
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">{t("movement.empty.noMovements")}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {t("movement.empty.addFirst")}
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
