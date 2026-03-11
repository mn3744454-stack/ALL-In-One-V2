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

interface MovementsListProps {
  onRecordMovement: () => void;
}

export function MovementsList({ onRecordMovement }: MovementsListProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedMovement, setSelectedMovement] = useState<HorseMovement | null>(null);
  const [dispatchMovementId, setDispatchMovementId] = useState<string | null>(null);
  
  const { movements, isLoading, canManage, dispatchMovement, isDispatching } = useHorseMovements(filters);
  const { locations } = useLocations();

  // Find the horse for the movement being dispatched
  const dispatchMovement_ = dispatchMovementId
    ? movements.find(m => m.id === dispatchMovementId)
    : null;
  const dispatchHorseId = dispatchMovement_?.horse_id || null;

  // Fetch active admission for the horse being dispatched (for financial gate)
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
      <MovementFilters
        filters={filters}
        onFiltersChange={setFilters}
        locations={locations}
      />

      {canManage && (
        <Button onClick={onRecordMovement} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 me-2" />
          {t("movement.form.recordMovement")}
        </Button>
      )}

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
        <div className="space-y-3">
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
