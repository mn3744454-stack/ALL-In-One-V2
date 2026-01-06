import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MovementCard } from "./MovementCard";
import { MovementFilters } from "./MovementFilters";
import { useI18n } from "@/i18n";
import { Plus, Package } from "lucide-react";
import { useHorseMovements, type MovementFilters as FiltersType } from "@/hooks/movement/useHorseMovements";
import { useLocations } from "@/hooks/movement/useLocations";
import { Skeleton } from "@/components/ui/skeleton";

interface MovementsListProps {
  onRecordMovement: () => void;
}

export function MovementsList({ onRecordMovement }: MovementsListProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<FiltersType>({});
  
  const { movements, isLoading, canManage } = useHorseMovements(filters);
  const { locations } = useLocations();

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
      {/* Filters */}
      <MovementFilters
        filters={filters}
        onFiltersChange={setFilters}
        locations={locations}
      />

      {/* Record button for managers */}
      {canManage && (
        <Button onClick={onRecordMovement} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 me-2" />
          {t("movement.form.recordMovement")}
        </Button>
      )}

      {/* List or Empty State */}
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
            <MovementCard key={movement.id} movement={movement} />
          ))}
        </div>
      )}
    </div>
  );
}
