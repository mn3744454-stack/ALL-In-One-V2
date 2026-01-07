import { useI18n } from "@/i18n";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, DoorOpen, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface HousingSelectorProps {
  branchId: string | null;
  selectedAreaId: string | null;
  selectedUnitId: string | null;
  onAreaChange: (areaId: string | null) => void;
  onUnitChange: (unitId: string | null) => void;
  onSkip: () => void;
}

export function HousingSelector({
  branchId,
  selectedAreaId,
  selectedUnitId,
  onAreaChange,
  onUnitChange,
  onSkip,
}: HousingSelectorProps) {
  const { t, dir } = useI18n();
  
  // Fetch areas for the selected branch
  const { activeAreas, isLoading: areasLoading } = useFacilityAreas(branchId || undefined);
  
  // Fetch units for the selected area
  const { activeUnits, isLoading: unitsLoading } = useHousingUnits(
    branchId || undefined, 
    selectedAreaId || undefined
  );

  const handleAreaChange = (value: string) => {
    if (value === "none") {
      onAreaChange(null);
      onUnitChange(null);
    } else {
      onAreaChange(value);
      onUnitChange(null); // Reset unit when area changes
    }
  };

  const handleUnitChange = (value: string) => {
    if (value === "none") {
      onUnitChange(null);
    } else {
      onUnitChange(value);
    }
  };

  const getCapacityDisplay = (unit: typeof activeUnits[0]) => {
    if (unit.occupancy === 'single') {
      return unit.current_occupants && unit.current_occupants >= 1 
        ? t("movement.housing.occupied")
        : t("movement.housing.available");
    }
    return `${unit.current_occupants || 0}/${unit.capacity}`;
  };

  const isUnitFull = (unit: typeof activeUnits[0]) => {
    if (unit.occupancy === 'single') {
      return (unit.current_occupants || 0) >= 1;
    }
    return (unit.current_occupants || 0) >= unit.capacity;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-center">{t("movement.wizard.stepHousingTitle")}</h3>
      <p className="text-sm text-muted-foreground text-center">
        {t("movement.wizard.stepHousingDesc")}
      </p>

      {/* Skip Button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onSkip}
      >
        <SkipForward className="h-4 w-4" />
        {t("movement.form.skipHousing")}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("common.or") || "or"}
          </span>
        </div>
      </div>

      {/* Area Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {t("movement.form.area")}
        </Label>
        <Select
          value={selectedAreaId || "none"}
          onValueChange={handleAreaChange}
          disabled={!branchId || areasLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("movement.form.selectArea")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("movement.form.selectArea")}</SelectItem>
            {activeAreas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                <span className="flex items-center gap-2">
                  {dir === 'rtl' && area.name_ar ? area.name_ar : area.name}
                  {area.code && (
                    <Badge variant="outline" className="text-xs">
                      {area.code}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!branchId && (
          <p className="text-xs text-muted-foreground">
            {t("movement.housing.selectLocationFirst")}
          </p>
        )}
        {branchId && activeAreas.length === 0 && !areasLoading && (
          <p className="text-xs text-muted-foreground">
            {t("movement.housing.noAreasInBranch")}
          </p>
        )}
      </div>

      {/* Unit Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          {t("movement.form.unit")}
        </Label>
        <Select
          value={selectedUnitId || "none"}
          onValueChange={handleUnitChange}
          disabled={!selectedAreaId || unitsLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("movement.form.selectUnit")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("movement.form.selectUnit")}</SelectItem>
            {activeUnits.map((unit) => {
              const isFull = isUnitFull(unit);
              return (
                <SelectItem 
                  key={unit.id} 
                  value={unit.id}
                  disabled={isFull}
                  className={cn(isFull && "opacity-50")}
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    <span>{unit.code}</span>
                    {unit.name && unit.name !== unit.code && (
                      <span className="text-muted-foreground">- {unit.name}</span>
                    )}
                    <Badge 
                      variant={isFull ? "destructive" : "secondary"} 
                      className="text-xs"
                    >
                      {getCapacityDisplay(unit)}
                    </Badge>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedAreaId && activeUnits.length === 0 && !unitsLoading && (
          <p className="text-xs text-muted-foreground">
            {t("movement.housing.noUnitsInArea")}
          </p>
        )}
      </div>

      {/* Selection Summary */}
      {(selectedAreaId || selectedUnitId) && (
        <div className={cn(
          "bg-muted/50 rounded-lg p-3 flex flex-wrap items-center gap-2",
          dir === 'rtl' && "justify-end"
        )}>
          {selectedAreaId && (
            <Badge variant="outline">
              {activeAreas.find(a => a.id === selectedAreaId)?.name || selectedAreaId}
            </Badge>
          )}
          {selectedUnitId && (
            <Badge>
              {activeUnits.find(u => u.id === selectedUnitId)?.code || selectedUnitId}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
