import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TENANT_TYPES, REGIONS, DirectoryFilters as Filters } from "@/hooks/useDirectory";

interface DirectoryFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const DirectoryFilters = ({
  filters,
  onFiltersChange,
}: DirectoryFiltersProps) => {
  const hasActiveFilters = filters.search || filters.type || filters.region;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, description, or tags..."
          value={filters.search || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
          className="pl-12 h-12 rounded-xl bg-card border-border/50 text-base"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        {/* Type Filter */}
        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              type: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[180px] h-10 rounded-xl">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TENANT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <Select
          value={filters.region || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              region: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[180px] h-10 rounded-xl">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((region) => (
              <SelectItem key={region.value} value={region.value}>
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 gap-2"
          >
            <X className="w-4 h-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
