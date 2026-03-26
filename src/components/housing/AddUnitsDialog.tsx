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
import { Loader2, Home, Package, Lock } from "lucide-react";
import type { FacilityArea, FacilityType } from "@/hooks/housing/useFacilityAreas";

type RoomFunction = 'default' | 'storage' | 'isolation_room';

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
    try {
      const defaultUnitType = facility.facility_type === 'isolation' ? 'isolation_room' : 'stall';
      for (const room of previewRooms) {
        const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
        await createUnit({
          branch_id: facility.branch_id,
          area_id: facility.id,
          code: room.code,
          name: room.code,
          unit_type: unitType as any,
          occupancy: 'single',
          capacity: 1,
        });
      }
      onOpenChange(false);
      setRoomSetup([]);
    } catch {
      // handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs">{t('housing.create.previewTitle')}</Label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5 p-3 bg-muted/30 rounded-lg border">
              {previewRooms.map((room) => (
                <Popover key={room.index}>
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
              ))}
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
