import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BilingualName } from "@/components/ui/BilingualName";
import { useHorses } from "@/hooks/useHorses";
import { useUnitOccupants } from "@/hooks/housing/useUnitOccupants";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface AssignHorseDialogProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignHorseDialog({ unit, open, onOpenChange }: AssignHorseDialogProps) {
  const { t, lang: language } = useI18n();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [reassignWarning, setReassignWarning] = useState<{ horseName: string; fromUnit: string } | null>(null);
  
  const { horses, loading: horsesLoading } = useHorses();
  const { assignHorse, isAssigning, occupants } = useUnitOccupants(unit?.id);

  if (!unit) return null;

  const isFull = (unit.current_occupants || 0) >= unit.capacity;
  const occupantHorseIds = new Set(occupants.map(o => o.horse_id));
  
  // Filter out horses already in this unit
  const availableHorses = horses.filter(h => !occupantHorseIds.has(h.id));

  const handleSelectAndCheck = (horseId: string) => {
    if (selectedHorseId === horseId) {
      setSelectedHorseId(null);
      return;
    }
    setSelectedHorseId(horseId);
  };

  const handleAssign = async () => {
    if (!selectedHorseId || !unit) return;

    // Check if horse is currently in another unit
    const horse = horses.find(h => h.id === selectedHorseId);
    if (horse?.housing_unit_id && horse.housing_unit_id !== unit.id) {
      const horseName = language === 'ar' && horse.name_ar ? horse.name_ar : horse.name;
      setReassignWarning({
        horseName,
        fromUnit: horse.housing_unit_id, // We don't have the unit code, use ID as fallback
      });
      return;
    }

    await performAssign();
  };

  const performAssign = async () => {
    if (!selectedHorseId || !unit) return;
    try {
      await assignHorse({ unitId: unit.id, horseId: selectedHorseId });
      setSelectedHorseId(null);
      setReassignWarning(null);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('housing.occupants.assignHorse')}</DialogTitle>
            <DialogDescription>
              {unit.name || unit.code}
            </DialogDescription>
          </DialogHeader>

          {isFull ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {unit.occupancy === 'single' 
                  ? t('housing.occupants.alreadyOccupied')
                  : t('housing.occupants.unitFull')}
              </AlertDescription>
            </Alert>
          ) : (
            <Command className="border rounded-lg">
              <CommandInput placeholder={t('common.search')} />
              <CommandList>
                <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                <CommandGroup>
                  {horsesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    availableHorses.map((horse) => {
                      const isSelected = selectedHorseId === horse.id;
                      
                      return (
                        <CommandItem
                          key={horse.id}
                          value={horse.name}
                          onSelect={() => handleSelectAndCheck(horse.id)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={horse.avatar_url || ''} />
                            <AvatarFallback>
                              {horse.name?.[0]?.toUpperCase() || 'H'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1">
                            <BilingualName
                              name={horse.name}
                              nameAr={horse.name_ar}
                              primaryClassName="text-sm"
                              secondaryClassName="text-xs"
                              inline
                            />
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </CommandItem>
                      );
                    })
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedHorseId || isAssigning || isFull}
            >
              {isAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment Warning Dialog */}
      <AlertDialog open={!!reassignWarning} onOpenChange={(open) => { if (!open) setReassignWarning(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.facilities.reassignWarningTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.facilities.reassignWarningDesc')
                .replace('{horse}', reassignWarning?.horseName || '')
                .replace('{fromUnit}', reassignWarning?.fromUnit || '')
                .replace('{toUnit}', unit?.code || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={performAssign}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
