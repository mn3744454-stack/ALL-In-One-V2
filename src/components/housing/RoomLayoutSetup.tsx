import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { LayoutGrid, Rows3, Home, Package, Lock } from "lucide-react";
import type { FacilityType } from "@/hooks/housing/useFacilityAreas";

// ─── Types ──────────────────────────────
export type RoomFunction = 'default' | 'storage' | 'isolation_room';
export type LayoutMode = 'single' | 'two_sided';
export type StartSide = 'a' | 'b';

export interface RoomSetup {
  index: number;
  code: string;
  fn: RoomFunction;
}

export interface RoomLayoutConfig {
  unitCount: number;
  codePrefix: string;
  startNumber: number;
  layoutMode: LayoutMode;
  startSide: StartSide;
  roomSetup: RoomSetup[];
  previewRooms: RoomSetup[];
}

interface RoomLayoutSetupProps {
  facilityType: FacilityType;
  maxUnits?: number;
  initialCount?: number;
  initialPrefix?: string;
  initialStartNumber?: number;
  onChange: (config: RoomLayoutConfig) => void;
}

export function RoomLayoutSetup({
  facilityType,
  maxUnits = 50,
  initialCount = 6,
  initialPrefix = 'S',
  initialStartNumber = 1,
  onChange,
}: RoomLayoutSetupProps) {
  const { t, lang: language } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';

  const [unitCount, setUnitCount] = useState(initialCount);
  const [codePrefix, setCodePrefix] = useState(initialPrefix);
  const [startNumber, setStartNumber] = useState(initialStartNumber);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('two_sided');
  const [startSide, setStartSide] = useState<StartSide>('a');
  const [roomSetup, setRoomSetup] = useState<RoomSetup[]>([]);

  const getRoomDefaultLabel = useCallback(() => {
    if (facilityType === 'isolation') return t('housing.create.roomIsolationDefault');
    if (isClinic) return t('housing.create.roomPatient');
    return t('housing.create.roomDefault');
  }, [facilityType, isClinic, t]);

  // Generate preview rooms
  const previewRooms = useMemo(() => {
    const count = Math.max(1, Math.min(unitCount || 1, maxUnits));
    const start = Math.max(1, startNumber || 1);
    const rooms: RoomSetup[] = [];
    for (let i = 0; i < count; i++) {
      const existingSetup = roomSetup.find(r => r.index === i);
      rooms.push({
        index: i,
        code: `${codePrefix}${String(start + i).padStart(2, '0')}`,
        fn: existingSetup?.fn || 'default',
      });
    }
    return rooms;
  }, [unitCount, codePrefix, startNumber, roomSetup, maxUnits]);

  // Push config to parent
  useMemo(() => {
    onChange({
      unitCount, codePrefix, startNumber, layoutMode, startSide, roomSetup, previewRooms,
    });
  }, [unitCount, codePrefix, startNumber, layoutMode, startSide, roomSetup, previewRooms, onChange]);

  // Two-sided layout helpers
  const twoSidedRows = useMemo(() => {
    if (layoutMode !== 'two_sided') return null;
    const half = Math.ceil(previewRooms.length / 2);
    const rowA = previewRooms.slice(0, half);
    const rowB = previewRooms.slice(half);
    if (startSide === 'b') return { topRow: rowB, bottomRow: rowA };
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

  const RoomCell = ({ room }: { room: RoomSetup }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-md border text-[10px] transition-all hover:scale-105 cursor-pointer min-h-[48px]",
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
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-1">
          {isClinic ? t('housing.create.wardSetup') : t('housing.create.stallSetup')}
        </h4>
        <p className="text-xs text-muted-foreground">{t('housing.create.unitSetupDesc')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t('housing.create.unitCount')} *</Label>
          <Input
            type="number" min={1} max={maxUnits}
            value={unitCount}
            onChange={(e) => setUnitCount(Math.max(1, Math.min(maxUnits, parseInt(e.target.value) || 1)))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('housing.create.codePrefix')}</Label>
          <Input
            value={codePrefix}
            onChange={(e) => setCodePrefix(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="S" maxLength={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('housing.create.startNumber')}</Label>
          <Input
            type="number" min={1} max={999}
            value={startNumber}
            onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      {/* Layout Mode Toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-xs shrink-0">{t('housing.create.layout')}</Label>
        <div className="flex border rounded-lg overflow-hidden">
          <button type="button" onClick={() => setLayoutMode('single')}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              layoutMode === 'single' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"
            )}>
            <LayoutGrid className="w-3.5 h-3.5" />
            {t('housing.create.layoutSingle')}
          </button>
          <button type="button" onClick={() => setLayoutMode('two_sided')}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              layoutMode === 'two_sided' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"
            )}>
            <Rows3 className="w-3.5 h-3.5" />
            {t('housing.create.layoutTwoSided')}
          </button>
        </div>
      </div>

      {layoutMode === 'two_sided' && (
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">{t('housing.create.startSide')}</Label>
          <div className="flex border rounded-lg overflow-hidden">
            <button type="button" onClick={() => setStartSide('a')}
              className={cn("px-3 py-1.5 text-xs transition-colors",
                startSide === 'a' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"
              )}>
              {t('housing.create.startFromSideA')}
            </button>
            <button type="button" onClick={() => setStartSide('b')}
              className={cn("px-3 py-1.5 text-xs transition-colors",
                startSide === 'b' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"
              )}>
              {t('housing.create.startFromSideB')}
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('housing.create.previewTitle')}</Label>
          <span className="text-[10px] text-muted-foreground">{t('housing.create.clickToAssign')}</span>
        </div>

        {layoutMode === 'two_sided' && twoSidedRows ? (
          <div className="p-3 bg-muted/30 rounded-lg border space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                {t('housing.create.sideA')}
              </span>
              <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(65px, 1fr))` }}>
                {twoSidedRows.topRow.map((room) => <RoomCell key={room.index} room={room} />)}
              </div>
            </div>
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
            {twoSidedRows.bottomRow.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                  {t('housing.create.sideB')}
                </span>
                <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(65px, 1fr))` }}>
                  {twoSidedRows.bottomRow.map((room) => <RoomCell key={room.index} room={room} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-1.5 p-3 bg-muted/30 rounded-lg border" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(70px, 1fr))` }}>
            {previewRooms.map((room) => <RoomCell key={room.index} room={room} />)}
          </div>
        )}

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
  );
}
