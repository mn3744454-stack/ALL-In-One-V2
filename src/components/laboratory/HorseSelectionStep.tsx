import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, X, Building2, Globe, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { MultiHorseSelector } from "./MultiHorseSelector";
import { WalkInHorseForm } from "./WalkInHorseForm";
import { toast } from "sonner";

export type HorseType = 'internal' | 'platform' | 'walk_in';

export interface SelectedHorse {
  horse_id?: string;
  horse_type: HorseType;
  horse_name: string;
  horse_data?: {
    passport_number?: string;
    microchip?: string;
    breed?: string;
    color?: string;
  };
}

interface HorseSelectionStepProps {
  selectedHorses: SelectedHorse[];
  onHorsesChange: (horses: SelectedHorse[]) => void;
  disabled?: boolean;
}

export function HorseSelectionStep({ 
  selectedHorses, 
  onHorsesChange,
  disabled = false 
}: HorseSelectionStepProps) {
  const { t, dir } = useI18n();
  const [selectionMode, setSelectionMode] = useState<HorseType | null>(
    selectedHorses.length > 0 ? selectedHorses[0].horse_type : null
  );
  const [showWalkInForm, setShowWalkInForm] = useState(false);

  const handleModeChange = (mode: HorseType) => {
    // Prevent selecting platform mode - show toast instead
    if (mode === 'platform') {
      toast.info(t("laboratory.horseSelection.platformComingSoon"));
      return;
    }
    setSelectionMode(mode);
    // Clear selected horses when changing mode
    onHorsesChange([]);
    setShowWalkInForm(false);
  };

  const handleAddInternalHorses = (horses: Array<{ id: string; name: string }>) => {
    const newHorses: SelectedHorse[] = horses.map(h => ({
      horse_id: h.id,
      horse_type: 'internal' as HorseType,
      horse_name: h.name,
    }));
    onHorsesChange(newHorses);
  };

  const handleAddWalkInHorse = (horse: SelectedHorse) => {
    onHorsesChange([...selectedHorses, horse]);
    setShowWalkInForm(false);
  };

  const handleRemoveHorse = (index: number) => {
    const updated = [...selectedHorses];
    updated.splice(index, 1);
    onHorsesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Selection Mode */}
      <div className="space-y-2">
        <Label>{t("laboratory.horseSelection.selectType")}</Label>
        <RadioGroup
          value={selectionMode || ""}
          onValueChange={(v) => handleModeChange(v as HorseType)}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          disabled={disabled}
        >
          {/* Internal/Facility Horses */}
          <Label
            htmlFor="internal"
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectionMode === 'internal' 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="internal" id="internal" className="sr-only" />
            <Building2 className="h-6 w-6 mb-2 text-primary" />
            <span className="text-sm font-medium">{t("laboratory.horseSelection.internal")}</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {t("laboratory.horseSelection.internalDesc")}
            </span>
          </Label>

          {/* Platform Search - Disabled with Coming Soon badge */}
          <Label
            htmlFor="platform"
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all relative",
              "border-muted opacity-60 cursor-not-allowed"
            )}
            onClick={(e) => {
              e.preventDefault();
              toast.info(t("laboratory.horseSelection.platformComingSoon"));
            }}
          >
            <RadioGroupItem value="platform" id="platform" className="sr-only" disabled />
            <Globe className="h-6 w-6 mb-2 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t("laboratory.horseSelection.platform")}</span>
            <Badge variant="outline" className="text-xs mt-1 bg-muted">
              {t("common.comingSoon")}
            </Badge>
          </Label>

          {/* Walk-in / Manual Entry */}
          <Label
            htmlFor="walk_in"
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all",
              selectionMode === 'walk_in' 
                ? "border-primary bg-primary/5" 
                : "border-muted hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="walk_in" id="walk_in" className="sr-only" />
            <UserPlus className="h-6 w-6 mb-2 text-orange-500" />
            <span className="text-sm font-medium">{t("laboratory.horseSelection.walkIn")}</span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {t("laboratory.horseSelection.walkInDesc")}
            </span>
          </Label>
        </RadioGroup>
      </div>

      {/* Internal Horse Selector - Full width wrapper */}
      {selectionMode === 'internal' && (
        <div className="w-full">
          <MultiHorseSelector
            selectedHorseIds={selectedHorses.filter(h => h.horse_type === 'internal').map(h => h.horse_id!)}
            onSelectionChange={handleAddInternalHorses}
            disabled={disabled}
          />
        </div>
      )}

      {/* Walk-in Horse Form - Proper scrolling without nested ScrollArea */}
      {selectionMode === 'walk_in' && (
        <div className="w-full space-y-4 pb-4">
          {/* Selected Walk-in Horses - Compact badges with max height */}
          {selectedHorses.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
              {selectedHorses.map((horse, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="flex items-center gap-1 px-3 py-1.5"
                >
                  <span>{horse.horse_name}</span>
                  {horse.horse_data?.passport_number && (
                    <span className="text-xs text-muted-foreground">
                      ({horse.horse_data.passport_number})
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ms-1 hover:bg-destructive/20"
                    onClick={() => handleRemoveHorse(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add Walk-in Form Toggle */}
          {!showWalkInForm ? (
            <Button
              variant="outline"
              onClick={() => setShowWalkInForm(true)}
              disabled={disabled}
              className="w-full"
            >
              <Plus className="h-4 w-4 me-2" />
              {t("laboratory.horseSelection.addHorse")}
            </Button>
          ) : (
            <WalkInHorseForm
              onSubmit={handleAddWalkInHorse}
              onCancel={() => setShowWalkInForm(false)}
            />
          )}
        </div>
      )}

      {/* Selected Count Badge */}
      {selectedHorses.length > 0 && (
        <div className="flex items-center justify-end">
          <Badge variant="default" className="text-sm">
            {selectedHorses.length} {t("laboratory.horseSelection.horsesSelected")}
          </Badge>
        </div>
      )}
    </div>
  );
}
