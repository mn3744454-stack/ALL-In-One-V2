import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { OrderFilters } from "@/hooks/useHorseOrders";
import { useI18n } from "@/i18n";
import { tStatus, tSeverity } from "@/i18n/labels";

interface HorseOption {
  id: string;
  name: string;
}

interface OrderFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  horses: HorseOption[];
}

export function OrderFilters({ filters, onFiltersChange, horses }: OrderFiltersProps) {
  const { t } = useI18n();
  const hasFilters = filters.status || filters.priority || filters.horse_id || filters.search;

  const statusOptions = [
    { value: "all", label: t("orders.filters.allStatuses") },
    { value: "draft", label: tStatus("draft") },
    { value: "pending", label: tStatus("pending") },
    { value: "scheduled", label: tStatus("scheduled") },
    { value: "in_progress", label: tStatus("in_progress") },
    { value: "completed", label: tStatus("completed") },
    { value: "cancelled", label: tStatus("cancelled") },
  ];

  const priorityOptions = [
    { value: "all", label: t("orders.filters.allPriorities") },
    { value: "low", label: tSeverity("low") },
    { value: "medium", label: tSeverity("medium") },
    { value: "high", label: tSeverity("high") },
    { value: "urgent", label: tSeverity("urgent") },
  ];

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("orders.filters.searchOrders")}
          value={filters.search || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
          className="ps-9 h-9"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={(val) =>
          onFiltersChange({ ...filters, status: val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder={t("orders.filters.status")} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority || "all"}
        onValueChange={(val) =>
          onFiltersChange({ ...filters, priority: val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder={t("orders.filters.priority")} />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Horse Filter */}
      <Select
        value={filters.horse_id || "all"}
        onValueChange={(val) =>
          onFiltersChange({ ...filters, horse_id: val === "all" ? undefined : val })
        }
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder={t("orders.filters.allHorses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("orders.filters.allHorses")}</SelectItem>
          {horses.map((horse) => (
            <SelectItem key={horse.id} value={horse.id}>
              {horse.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9">
          <X className="w-4 h-4" />
          {t("common.clear")}
        </Button>
      )}
    </div>
  );
}
