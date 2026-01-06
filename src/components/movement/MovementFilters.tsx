import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MovementFilters as FiltersType } from "@/hooks/movement/useHorseMovements";
import type { Location } from "@/hooks/movement/useLocations";

interface MovementFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  locations: Location[];
}

export function MovementFilters({
  filters,
  onFiltersChange,
  locations,
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

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("movement.filters.searchPlaceholder")}
          value={filters.search || ""}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="ps-9"
        />
      </div>

      {/* Date range chips */}
      <div className="flex gap-2 flex-wrap">
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
      </div>

      {/* Dropdowns */}
      <div className="flex gap-2 flex-wrap">
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
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[140px]">
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
      </div>
    </div>
  );
}
