import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Check, X } from "lucide-react";
import { useLabHorses, type LabHorse } from "@/hooks/laboratory/useLabHorses";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { LabHorseFormDialog } from "./LabHorseFormDialog";
import type { SelectedHorse } from "./HorseSelectionStep";

interface LabHorsePickerProps {
  selectedHorses: SelectedHorse[];
  onHorsesChange: (horses: SelectedHorse[]) => void;
  clientId?: string;
  disabled?: boolean;
}

export function LabHorsePicker({
  selectedHorses,
  onHorsesChange,
  clientId,
  disabled = false,
}: LabHorsePickerProps) {
  const { t, dir, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [horseDialogOpen, setHorseDialogOpen] = useState(false);
  
  // Filter horses by clientId when provided (10.1)
  const { labHorses, loading } = useLabHorses({ search, clientId });

  // Get selected lab horse IDs
  const selectedIds = useMemo(() => {
    return selectedHorses
      .filter(h => h.horse_type === 'lab_horse' && h.horse_id)
      .map(h => h.horse_id!);
  }, [selectedHorses]);

  const handleToggleHorse = (horse: LabHorse) => {
    const isSelected = selectedIds.includes(horse.id);
    
    if (isSelected) {
      // Remove
      onHorsesChange(selectedHorses.filter(h => h.horse_id !== horse.id));
    } else {
      // Add - use Arabic name if available and language is Arabic
      const displayName = lang === 'ar' && horse.name_ar ? horse.name_ar : horse.name;
      const newSelected: SelectedHorse = {
        horse_id: horse.id,
        horse_type: 'lab_horse',
        horse_name: displayName,
        horse_data: {
          passport_number: horse.passport_number || undefined,
          microchip: horse.microchip_number || undefined,
          breed: horse.breed_text || undefined,
          color: horse.color_text || undefined,
        },
      };
      onHorsesChange([...selectedHorses, newSelected]);
    }
  };

  const handleRemoveHorse = (index: number) => {
    const updated = [...selectedHorses];
    updated.splice(index, 1);
    onHorsesChange(updated);
  };

  const handleHorseCreated = (horse: SelectedHorse) => {
    // Auto-select the newly created horse
    onHorsesChange([...selectedHorses, horse]);
  };

  // Get display name for horse (bilingual support)
  const getHorseDisplayName = (horse: LabHorse) => {
    if (lang === 'ar' && horse.name_ar) return horse.name_ar;
    return horse.name;
  };

  if (loading && labHorses.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Selected Horses Summary */}
      {selectedHorses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md">
          {selectedHorses.map((horse, idx) => (
            <Badge 
              key={horse.horse_id || idx} 
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
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
          dir === 'rtl' ? 'right-3' : 'left-3'
        )} />
        <Input
          placeholder={t("laboratory.labHorses.searchPlaceholder") || "Search by name, microchip, passport, owner..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(dir === 'rtl' ? 'pr-9' : 'pl-9')}
          disabled={disabled}
        />
      </div>

      {/* Create New Horse Button - Opens Dialog */}
      <Button
        variant="outline"
        onClick={() => setHorseDialogOpen(true)}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 me-2" />
        {t("laboratory.labHorses.registerHorse")}
      </Button>

      {/* Horses List */}
      <div className="max-h-[40vh] sm:max-h-[280px] w-full min-w-0 overflow-y-auto rounded-md border">
        <div className="p-2 space-y-1 w-full">
          {labHorses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search 
                ? (t("laboratory.labHorses.noMatchingHorses") || "No horses match your search")
                : (t("laboratory.labHorses.noHorses") || "No horses registered yet")
              }
            </div>
          ) : (
            labHorses.map((horse) => {
              const isSelected = selectedIds.includes(horse.id);
              return (
                <div
                  key={horse.id}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/10 border border-primary/20",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && handleToggleHorse(horse)}
                >
                  <div className={cn(
                    "h-5 w-5 shrink-0 rounded border flex items-center justify-center",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getHorseDisplayName(horse).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{getHorseDisplayName(horse)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[
                        horse.passport_number,
                        horse.microchip_number,
                        horse.owner_name,
                      ].filter(Boolean).join(" · ") || t("laboratory.labHorses.noDetails")}
                    </div>
                  </div>
                  {horse.breed_text && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {horse.breed_text}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Count */}
      {selectedHorses.length > 0 && (
        <div className="flex items-center justify-end">
          <Badge variant="default" className="text-sm">
            {selectedHorses.length} {t("laboratory.horseSelection.horsesSelected")}
          </Badge>
        </div>
      )}

      {/* Horse Form Dialog */}
      <LabHorseFormDialog
        open={horseDialogOpen}
        onOpenChange={setHorseDialogOpen}
        onSuccess={handleHorseCreated}
        defaultClientId={clientId}
      />
    </div>
  );
}
