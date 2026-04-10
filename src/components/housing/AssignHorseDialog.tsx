import { useState, useMemo, useCallback } from "react";
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
import { useInternalMove } from "@/hooks/housing/useInternalMove";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Check, AlertCircle, Loader2, MapPin, ArrowRightLeft, Info, Plus } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";
import { QuickCreateHorseDialog } from "./QuickCreateHorseDialog";

interface AssignHorseDialogProps {
  unit: HousingUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when Scenario A fires — opens AdmissionWizard with prefilled context */
  onAdmitHorse?: (horseId: string) => void;
}

interface AdmissionInfo {
  id: string;
  branch_id: string;
  area_id: string | null;
  unit_id: string | null;
  status: string;
  branch?: { name: string } | null;
}

export function AssignHorseDialog({ unit, open, onOpenChange, onAdmitHorse }: AssignHorseDialogProps) {
  const { t, lang: language } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [moveConfirm, setMoveConfirm] = useState<{
    horseName: string;
    admission: AdmissionInfo;
    fromUnitCode: string | null;
  } | null>(null);
  const [crossBranchBlock, setCrossBranchBlock] = useState<{
    horseName: string;
    branchName: string;
  } | null>(null);
  const [checkingAdmission, setCheckingAdmission] = useState(false);

  const { horses, loading: horsesLoading, refresh: refreshHorses } = useHorses();
  const { occupants } = useUnitOccupants(unit?.id);
  const { moveHorse, isMoving } = useInternalMove();

  const unitBranchId = unit?.branch_id;

  const availableHorses = useMemo(() => {
    if (!unit) return [];
    const occupantHorseIds = new Set(occupants.map(o => o.horse_id));
    return horses.filter(h => !occupantHorseIds.has(h.id));
  }, [horses, occupants, unit]);

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

  const handleClose = useCallback(() => {
    setSelectedHorseId(null);
    setMoveConfirm(null);
    setCrossBranchBlock(null);
    onOpenChange(false);
  }, [onOpenChange]);

  if (!unit) return null;

  const isFull = (unit.current_occupants || 0) >= unit.capacity;
  const isUnavailable = unit.status === 'maintenance' || unit.status === 'out_of_service';

  /**
   * After selecting a horse, check admission state to branch into:
   * - Scenario A: no active admission → open AdmissionWizard
   * - Scenario B: active admission at same branch → confirm internal move
   * - Scenario C: active admission at different branch → block
   */
  const handleSelectAndCheck = async (horseId: string) => {
    if (selectedHorseId === horseId) {
      setSelectedHorseId(null);
      return;
    }
    setSelectedHorseId(horseId);
  };

  const handleConfirm = async () => {
    if (!selectedHorseId || !tenantId || !unit) return;

    setCheckingAdmission(true);
    try {
      // Check for active admission
      const { data: admission, error } = await supabase
        .from('boarding_admissions')
        .select('id, branch_id, area_id, unit_id, status, branch:branches(name)')
        .eq('tenant_id', tenantId)
        .eq('horse_id', selectedHorseId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      const horse = horses.find(h => h.id === selectedHorseId);
      const horseName = language === 'ar' && horse?.name_ar ? horse.name_ar : horse?.name || '';

      if (!admission) {
        // Scenario A: no active admission → launch AdmissionWizard prefilled
        handleClose();
        onAdmitHorse?.(selectedHorseId);
        return;
      }

      if (admission.branch_id === unitBranchId) {
        // Scenario B: same branch → show move confirmation
        const fromUnit = admission.unit_id;
        let fromUnitCode: string | null = null;
        if (fromUnit) {
          const { data: fromUnitData } = await supabase
            .from('housing_units')
            .select('code')
            .eq('id', fromUnit)
            .single();
          fromUnitCode = fromUnitData?.code || null;
        }
        setMoveConfirm({
          horseName,
          admission: admission as any,
          fromUnitCode,
        });
      } else {
        // Scenario C: different branch → block
        const branchName = (admission as any).branch?.name || t('housing.units.differentBranch');
        setCrossBranchBlock({ horseName, branchName });
      }
    } catch (err: any) {
      console.error('Admission check failed:', err);
    } finally {
      setCheckingAdmission(false);
    }
  };

  const handleMoveConfirm = async () => {
    if (!moveConfirm || !selectedHorseId || !unit) return;
    try {
      await moveHorse({
        horseId: selectedHorseId,
        admissionId: moveConfirm.admission.id,
        fromUnitId: moveConfirm.admission.unit_id,
        fromAreaId: moveConfirm.admission.area_id,
        toUnitId: unit.id,
        toAreaId: unit.area_id,
        toBranchId: unit.branch_id,
      });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const renderHorseItem = (horse: typeof availableHorses[0]) => {
    const isSelected = selectedHorseId === horse.id;
    const hasUnit = !!horse.housing_unit_id;
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
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('housing.occupants.admitHorse')}</DialogTitle>
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
            <>
              <Command className="border rounded-lg">
                <CommandInput placeholder={t('common.search')} />
                <CommandList>
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 py-4">
                      <p className="text-sm text-muted-foreground">{t('housing.quickCreate.noHorsesYet')}</p>
                      <p className="text-xs text-muted-foreground">{t('housing.quickCreate.noHorsesDesc')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1"
                        onClick={() => setQuickCreateOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5 ltr:mr-1 rtl:ml-1" />
                        {t('housing.quickCreate.addNewHorse')}
                      </Button>
                    </div>
                  </CommandEmpty>
                  {horsesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {sameBranchHorses.length > 0 && (
                        <CommandGroup heading={t('housing.units.sameBranch')}>
                          {sameBranchHorses.map(renderHorseItem)}
                        </CommandGroup>
                      )}
                      {otherBranchHorses.length > 0 && (
                        <CommandGroup heading={sameBranchHorses.length > 0 ? t('housing.units.differentBranch') : undefined}>
                          {otherBranchHorses.map(renderHorseItem)}
                        </CommandGroup>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
              {/* Always-visible add-new-horse CTA */}
              {!horsesLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-primary"
                  onClick={() => setQuickCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 ltr:mr-1 rtl:ml-1" />
                  {t('housing.quickCreate.addNewHorse')}
                </Button>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedHorseId || checkingAdmission || isFull || isUnavailable}
            >
              {checkingAdmission ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scenario B: Internal Move Confirmation */}
      <AlertDialog open={!!moveConfirm} onOpenChange={(open) => { if (!open) setMoveConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.facilities.reassignWarningTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.facilities.reassignWarningDesc')
                .replace('{horse}', moveConfirm?.horseName || '')
                .replace('{fromUnit}', moveConfirm?.fromUnitCode || t('housing.occupants.noUnit'))
                .replace('{toUnit}', unit?.code || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveConfirm} disabled={isMoving}>
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scenario C: Cross-Branch Block */}
      <AlertDialog open={!!crossBranchBlock} onOpenChange={(open) => { if (!open) setCrossBranchBlock(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-500" />
                {t('housing.occupants.crossBranchTitle')}
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.occupants.crossBranchDesc')
                .replace('{horse}', crossBranchBlock?.horseName || '')
                .replace('{branch}', crossBranchBlock?.branchName || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCrossBranchBlock(null)}>
              {t('common.understood')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
