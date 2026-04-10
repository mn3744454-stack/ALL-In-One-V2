import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import type { MovementFilters as FiltersType } from "@/hooks/movement/useHorseMovements";
import type { Location } from "@/hooks/movement/useLocations";
import { type ReactNode } from "react";

interface MovementFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  locations: Location[];
  viewSwitcher?: ReactNode;
}

export function MovementFilters({
  filters,
  onFiltersChange,
  locations,
  viewSwitcher,
}: MovementFiltersProps) {
  const { t } = useI18n();

  const dateRangeOptions = [
    { value: "all", label: t("movement.filters.all") },
    { value: "today", label: t("movement.filters.today") },
    { value: "week", label: t("movement.filters.thisWeek") },
  ];

  const typeOptions = [
    { value: "all", label: t("movement.filters.allTypes") },
    { value: "in", label: t("movement.types.in") },
    { value: "out", label: t("movement.types.out") },
    { value: "transfer", label: t("movement.types.transfer") },
  ];

  const statusOptions = [
    { value: "all", label: t("movement.filters.allStatuses") },
    { value: "scheduled", label: t("movement.lifecycle.statusScheduled") },
    { value: "dispatched", label: t("movement.lifecycle.statusDispatched") },
    { value: "completed", label: t("movement.lifecycle.statusCompleted") },
    { value: "cancelled", label: t("movement.lifecycle.statusCancelled") },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date range chips */}
      {dateRangeOptions.map((option) => (
        <Button
          key={option.value}
          variant={filters.dateRange === option.value || (!filters.dateRange && option.value === "all") ? "default" : "outline"}
          size="sm"
          onClick={() =>
            onFiltersChange({
              ...filters,
              dateRange: option.value === "all" ? undefined : option.value as "today" | "week",
            })
          }
        >
          {option.label}
        </Button>
      ))}

      {/* Location filter */}
      <Select
        value={filters.locationId || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            locationId: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="flex-1 min-w-[140px]">
          <SelectValue placeholder={t("movement.filters.allLocations")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("movement.filters.allLocations")}</SelectItem>
          {locations.filter(l => l.is_active).map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select
        value={filters.movementType || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            movementType: value === "all" ? undefined : value as "in" | "out" | "transfer",
          })
        }
      >
        <SelectTrigger className="flex-1 min-w-[120px]">
          <SelectValue placeholder={t("movement.filters.allTypes")} />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.movementStatus || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            movementStatus: value === "all" ? undefined : value as "scheduled" | "dispatched" | "completed" | "cancelled",
          })
        }
      >
        <SelectTrigger className="flex-1 min-w-[120px]">
          <SelectValue placeholder={t("movement.filters.allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* View switcher at trailing end */}
      {viewSwitcher}
    </div>
  );
}
