import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { Loader2, Home, Package, Lock, LayoutGrid, Rows3 } from "lucide-react";
import type { FacilityArea, FacilityType } from "@/hooks/housing/useFacilityAreas";

type RoomFunction = 'default' | 'storage' | 'isolation_room';
type LayoutMode = 'single' | 'two_sided';
type StartSide = 'a' | 'b';

interface RoomSetup {
  index: number;
  code: string;
  fn: RoomFunction;
}

interface AddUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: FacilityArea;
  existingUnitCount: number;
}

export function AddUnitsDialog({ open, onOpenChange, facility, existingUnitCount }: AddUnitsDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';
  const { createUnit } = useHousingUnits();

  const [count, setCount] = useState(2);
  const [codePrefix, setCodePrefix] = useState('S');
  const [startNumber, setStartNumber] = useState(existingUnitCount + 1);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('two_sided');
  const [startSide, setStartSide] = useState<StartSide>('a');
  const [roomSetup, setRoomSetup] = useState<RoomSetup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoomDefaultLabel = useCallback(() => {
    if (facility.facility_type === 'isolation') return t('housing.create.roomIsolationDefault');
    if (isClinic) return t('housing.create.roomPatient');
    return t('housing.create.roomDefault');
  }, [facility.facility_type, isClinic, t]);

  const previewRooms = useMemo(() => {
    const rooms: RoomSetup[] = [];
    const start = Math.max(1, startNumber || 1);
    for (let i = 0; i < Math.min(count || 1, 30); i++) {
      const existing = roomSetup.find(r => r.index === i);
      rooms.push({
        index: i,
        code: `${codePrefix}${String(start + i).padStart(2, '0')}`,
        fn: existing?.fn || 'default',
      });
    }
    return rooms;
  }, [count, codePrefix, startNumber, roomSetup]);

  const twoSidedRows = useMemo(() => {
    if (layoutMode !== 'two_sided') return null;
    const half = Math.ceil(previewRooms.length / 2);
    const rowA = previewRooms.slice(0, half);
    const rowB = previewRooms.slice(half);
    if (startSide === 'b') {
      return { topRow: rowB, bottomRow: rowA };
    }
    return { topRow: rowA, bottomRow: rowB };
  }, [layoutMode, previewRooms, startSide]);

  const setRoomFunction = (index: number, fn: RoomFunction) => {
    setRoomSetup(prev => {
      if (fn === 'default') return prev.filter(r => r.index !== index);
      const existing = prev.find(r => r.index === index);
      if (existing) return prev.map(r => r.index === index ? { ...r, fn } : r);
      return [...prev, { index, code: '', fn }];
    });
  };

  const getRoomColor = (fn: RoomFunction) => {
    switch (fn) {
      case 'storage': return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300';
      case 'isolation_room': return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300';
      default: return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300';
    }
  };

  const getRoomFnLabel = (fn: RoomFunction) => {
    switch (fn) {
      case 'storage': return t('housing.create.roomStorage');
      case 'isolation_room': return t('housing.create.roomIsolation');
      default: return getRoomDefaultLabel();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const defaultUnitType = facility.facility_type === 'isolation' ? 'isolation_room' : 'stall';
    let successCount = 0;
    let failCount = 0;

    for (const room of previewRooms) {
      const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
      try {
        await createUnit({
          branch_id: facility.branch_id,
          area_id: facility.id,
          code: room.code,
          name: room.code,
          unit_type: unitType as any,
          occupancy: 'single',
          capacity: 1,
        });
        successCount++;
      } catch {
        failCount++;
        // Skip duplicates or errors, continue with remaining units
      }
    }

    setIsSubmitting(false);

    if (failCount > 0 && successCount > 0) {
      toast.info(`${successCount} units created, ${failCount} skipped (may already exist)`);
    } else if (failCount > 0 && successCount === 0) {
      toast.error(t('housing.create.allUnitsFailed' as any) || 'All units failed — they may already exist');
    }

    // Always close and reset after attempt — grid will refresh via invalidation
    onOpenChange(false);
    setRoomSetup([]);
  };

  const RoomCell = ({ room }: { room: RoomSetup }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-md border text-[10px] transition-all hover:scale-105 cursor-pointer min-h-[44px]",
            getRoomColor(room.fn)
          )}
        >
          <span className="font-mono font-semibold text-[11px]">{room.code}</span>
          <span className="opacity-70 leading-none mt-0.5">{getRoomFnLabel(room.fn)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="center" side="top">
        <div className="space-y-0.5">
          {([
            { fn: 'default' as RoomFunction, icon: Home, label: getRoomDefaultLabel(), color: 'text-emerald-600' },
            { fn: 'storage' as RoomFunction, icon: Package, label: t('housing.create.roomStorage'), color: 'text-amber-600' },
            { fn: 'isolation_room' as RoomFunction, icon: Lock, label: t('housing.create.roomIsolation'), color: 'text-orange-600' },
          ]).map((opt) => (
            <button
              key={opt.fn}
              type="button"
              onClick={() => setRoomFunction(room.index, opt.fn)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors",
                room.fn === opt.fn ? "bg-accent font-medium" : "hover:bg-muted"
              )}
            >
              <opt.icon className={cn("w-3.5 h-3.5", opt.color)} />
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('housing.create.addUnitsTitle')}</DialogTitle>
          <DialogDescription>
            {t('housing.create.addUnitsDesc').replace('{name}', facility.name)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('housing.create.unitCount')}</Label>
              <Input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('housing.create.codePrefix')}</Label>
              <Input value={codePrefix} onChange={(e) => setCodePrefix(e.target.value.toUpperCase().slice(0, 4))} maxLength={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('housing.create.startNumber')}</Label>
              <Input type="number" min={1} max={999} value={startNumber} onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
          </div>

          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">{t('housing.create.layout')}</Label>
            <div className="flex border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setLayoutMode('single')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  layoutMode === 'single'
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {t('housing.create.layoutSingle')}
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('two_sided')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  layoutMode === 'two_sided'
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground"
                )}
              >
                <Rows3 className="w-3.5 h-3.5" />
                {t('housing.create.layoutTwoSided')}
              </button>
            </div>
          </div>

          {/* Start Side Toggle — only in two-sided mode */}
          {layoutMode === 'two_sided' && (
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">{t('housing.create.startSide')}</Label>
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStartSide('a')}
                  className={cn(
                    "px-3 py-1.5 text-xs transition-colors",
                    startSide === 'a'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {t('housing.create.startFromSideA')}
                </button>
                <button
                  type="button"
                  onClick={() => setStartSide('b')}
                  className={cn(
                    "px-3 py-1.5 text-xs transition-colors",
                    startSide === 'b'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {t('housing.create.startFromSideB')}
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('housing.create.previewTitle')}</Label>
              <span className="text-[10px] text-muted-foreground">
                {t('housing.create.clickToAssign')}
              </span>
            </div>

            {layoutMode === 'two_sided' && twoSidedRows ? (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-1">
                {/* Side A */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                    {t('housing.create.sideA')}
                  </span>
                  <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(55px, 1fr))` }}>
                    {twoSidedRows.topRow.map((room) => (
                      <RoomCell key={room.index} room={room} />
                    ))}
                  </div>
                </div>
                {/* Aisle */}
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0" />
                  <div className="flex-1 flex items-center gap-2 py-1.5">
                    <div className="flex-1 border-t-2 border-dashed border-muted-foreground/25" />
                    <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider shrink-0">
                      {t('housing.create.aisle')}
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-muted-foreground/25" />
                  </div>
                </div>
                {/* Side B */}
                {twoSidedRows.bottomRow.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                      {t('housing.create.sideB')}
                    </span>
                    <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(55px, 1fr))` }}>
                      {twoSidedRows.bottomRow.map((room) => (
                        <RoomCell key={room.index} room={room} />
                      ))}
                      {twoSidedRows.bottomRow.length < twoSidedRows.topRow.length && (
                        <div className="min-h-[44px]" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5 p-3 bg-muted/30 rounded-lg border">
                {previewRooms.map((room) => (
                  <RoomCell key={room.index} room={room} />
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
                {getRoomDefaultLabel()}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" />
                {t('housing.create.roomStorage')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-200 border border-orange-300" />
                {t('housing.create.roomIsolation')}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('housing.create.addUnitsSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
