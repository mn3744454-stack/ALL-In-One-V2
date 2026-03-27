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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BilingualName } from "@/components/ui/BilingualName";
import { useHorses } from "@/hooks/useHorses";
import { useUnitOccupants } from "@/hooks/housing/useUnitOccupants";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2, MapPin, ArrowRightLeft } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface AssignHorseDialogProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignHorseDialog({ unit, open, onOpenChange }: AssignHorseDialogProps) {
  const { t, lang: language } = useI18n();
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [reassignWarning, setReassignWarning] = useState<{ horseName: string; fromUnitCode: string } | null>(null);
  
  const { horses, loading: horsesLoading } = useHorses();
  const { assignHorse, isAssigning, occupants } = useUnitOccupants(unit?.id);

  // Get the branch ID of the target unit for filtering
  const unitBranchId = unit?.branch_id;

  const availableHorses = useMemo(() => {
    if (!unit) return [];
    const occupantHorseIds = new Set(occupants.map(o => o.horse_id));
    // Filter out horses already in this unit
    return horses.filter(h => !occupantHorseIds.has(h.id));
  }, [horses, occupants, unit]);

  // Separate into same-branch and other-branch horses
  const { sameBranchHorses, otherBranchHorses } = useMemo(() => {
    const same: typeof availableHorses = [];
    const other: typeof availableHorses = [];
    for (const h of availableHorses) {
      if (unitBranchId && h.current_location_id === unitBranchId) {
        same.push(h);
      } else {
        other.push(h);
      }
    }
    return { sameBranchHorses: same, otherBranchHorses: other };
  }, [availableHorses, unitBranchId]);

  if (!unit) return null;

  const isFull = (unit.current_occupants || 0) >= unit.capacity;
  const isUnavailable = unit.status === 'maintenance' || unit.status === 'out_of_service';

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
      // Try to show the unit code instead of UUID
      setReassignWarning({
        horseName,
        fromUnitCode: t('housing.units.currentUnit'),
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

  const renderHorseItem = (horse: typeof availableHorses[0]) => {
    const isSelected = selectedHorseId === horse.id;
    const hasUnit = !!horse.housing_unit_id;
    const isSameBranch = unitBranchId && horse.current_location_id === unitBranchId;
    const isDifferentBranch = horse.current_location_id && horse.current_location_id !== unitBranchId;

    return (
      <CommandItem
        key={horse.id}
        value={`${horse.name} ${horse.name_ar || ''}`}
        onSelect={() => handleSelectAndCheck(horse.id)}
        className="flex items-center gap-3 cursor-pointer"
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={horse.avatar_url || ''} />
          <AvatarFallback>
            {horse.name?.[0]?.toUpperCase() || 'H'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <BilingualName
            name={horse.name}
            nameAr={horse.name_ar}
            primaryClassName="text-sm"
            secondaryClassName="text-xs"
            inline
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            {hasUnit && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                <ArrowRightLeft className="w-2.5 h-2.5" />
                {t('housing.units.currentUnit')}
              </Badge>
            )}
            {isDifferentBranch && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5 text-amber-600 border-amber-200">
                <MapPin className="w-2.5 h-2.5" />
                {t('housing.units.differentBranch')}
              </Badge>
            )}
          </div>
        </div>
        {isSelected && (
          <Check className="w-4 h-4 text-primary shrink-0" />
        )}
      </CommandItem>
    );
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

          {isFull || isUnavailable ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isUnavailable
                  ? t('housing.units.unitUnavailable')
                  : unit.occupancy === 'single' 
                    ? t('housing.occupants.alreadyOccupied')
                    : t('housing.occupants.unitFull')}
              </AlertDescription>
            </Alert>
          ) : (
            <Command className="border rounded-lg">
              <CommandInput placeholder={t('common.search')} />
              <CommandList>
                <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                {horsesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Same-branch horses shown first */}
                    {sameBranchHorses.length > 0 && (
                      <CommandGroup heading={t('housing.units.sameBranch')}>
                        {sameBranchHorses.map(renderHorseItem)}
                      </CommandGroup>
                    )}
                    {/* Other horses in separate group */}
                    {otherBranchHorses.length > 0 && (
                      <CommandGroup heading={sameBranchHorses.length > 0 ? t('housing.units.differentBranch') : undefined}>
                        {otherBranchHorses.map(renderHorseItem)}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedHorseId || isAssigning || isFull || isUnavailable}
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
                .replace('{fromUnit}', reassignWarning?.fromUnitCode || '')
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
