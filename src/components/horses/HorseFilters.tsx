import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";

export interface HorseFiltersState {
  search: string;
  gender: string;
  status: string;
  breed_id: string;
  color_id: string;
}

interface HorseFiltersProps {
  filters: HorseFiltersState;
  onChange: (filters: HorseFiltersState) => void;
}

export const HorseFilters = ({ filters, onChange }: HorseFiltersProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { breeds, colors } = useHorseMasterData();

  const updateFilter = (key: keyof HorseFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({
      search: "",
      gender: "",
      status: "",
      breed_id: "",
      color_id: "",
    });
  };

  const hasActiveFilters = 
    filters.gender || filters.status || filters.breed_id || filters.color_id;

  const FilterContent = () => (
    <div className="flex flex-col gap-3">
      <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Genders</SelectItem>
          <SelectItem value="male">Male</SelectItem>
          <SelectItem value="female">Female</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.breed_id} onValueChange={(v) => updateFilter("breed_id", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Breed" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Breeds</SelectItem>
          {breeds.map((breed) => (
            <SelectItem key={breed.id} value={breed.id}>
              {breed.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.color_id} onValueChange={(v) => updateFilter("color_id", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Colors</SelectItem>
          {colors.map((color) => (
            <SelectItem key={color.id} value={color.id}>
              {color.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
          <X className="w-4 h-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search horses..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-2">
        <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.breed_id} onValueChange={(v) => updateFilter("breed_id", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Breed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Breeds</SelectItem>
            {breeds.map((breed) => (
              <SelectItem key={breed.id} value={breed.id}>
                {breed.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter Horses</SheetTitle>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
