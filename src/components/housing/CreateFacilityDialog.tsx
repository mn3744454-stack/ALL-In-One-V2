import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useFacilityAreas, FACILITY_TYPES, SUBDIVISION_CONFIG, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits, type CreateUnitData } from "@/hooks/housing/useHousingUnits";
import { useLocations } from "@/hooks/movement/useLocations";
import {
  Loader2, Building2, Fence, Dumbbell, Droplets,
  Warehouse, CircleDot, TreePine, ShieldAlert, Home,
  LayoutGrid, Rows3, Package, Lock
} from "lucide-react";

// ─── Facility category classification ──────────────────────────────
type FacilityCategory = 'housing' | 'open_area' | 'activity' | 'storage';

const FACILITY_CATEGORY: Record<FacilityType, FacilityCategory> = {
  barn: 'housing',
  isolation: 'housing',
  paddock: 'open_area',
  pasture: 'open_area',
  arena: 'activity',
  round_pen: 'activity',
  wash_area: 'activity',
  storage: 'storage',
};

const FACILITY_ICONS: Record<FacilityType, React.ElementType> = {
  barn: Home,
  isolation: ShieldAlert,
  paddock: Fence,
  pasture: TreePine,
  arena: Dumbbell,
  round_pen: CircleDot,
  wash_area: Droplets,
  storage: Warehouse,
};

// ─── Room exception type for setup ──────────────────────────────
type RoomFunction = 'default' | 'storage' | 'isolation_room';

type LayoutMode = 'single' | 'two_sided';

type StartSide = 'a' | 'b';

interface RoomSetup {
  index: number;
  code: string;
  fn: RoomFunction;
}

// ─── Props ──────────────────────────────
interface CreateFacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedBranchId?: string;
  effectiveBranchId?: string;
}

export function CreateFacilityDialog({
  open,
  onOpenChange,
  lockedBranchId,
  effectiveBranchId,
}: CreateFacilityDialogProps) {
  const { t, lang: language } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';

  const { activeLocations } = useLocations();
  const { createArea, isCreating } = useFacilityAreas();
  const { createUnit } = useHousingUnits();

  // ─── Form state ──────────────────────────────
  const [branchId, setBranchId] = useState(lockedBranchId || effectiveBranchId || '');
  const [facilityType, setFacilityType] = useState<FacilityType>('barn');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  // Housing-specific
  const [unitCount, setUnitCount] = useState(6);
  const [codePrefix, setCodePrefix] = useState('S');
  const [startNumber, setStartNumber] = useState(1);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('two_sided');
  const [startSide, setStartSide] = useState<StartSide>('a');
  const [roomSetup, setRoomSetup] = useState<RoomSetup[]>([]);
  // Open-area specific
  const [capacity, setCapacity] = useState<number | ''>('');
  const [areaSize, setAreaSize] = useState<number | ''>('');
  const [shade, setShade] = useState('none');
  const [hasWater, setHasWater] = useState(false);
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const category = FACILITY_CATEGORY[facilityType];
  const isHousing = category === 'housing';
  const isOpenArea = category === 'open_area';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';

  // ─── Account-type-aware label for housing types ──────────────────
  const getHousingLabel = useCallback(() => {
    if (isClinic) {
      return language === 'ar' ? 'عنبر' : 'Ward';
    }
    return language === 'ar' ? 'جناح' : 'Stall Block';
  }, [isClinic, language]);

  // ─── Account-aware room default label ──────────────────
  const getRoomDefaultLabel = useCallback(() => {
    if (facilityType === 'isolation') return t('housing.create.roomIsolationDefault');
    if (isClinic) return t('housing.create.roomPatient');
    return t('housing.create.roomDefault');
  }, [facilityType, isClinic, t]);

  // ─── Generate preview rooms when count/prefix/startNumber changes ──────
  const previewRooms = useMemo(() => {
    const count = Math.max(1, Math.min(unitCount || 1, 50));
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
  }, [unitCount, codePrefix, startNumber, roomSetup]);

  // ─── Set room function via popover ──────────────────────────────
  const setRoomFunction = (index: number, fn: RoomFunction) => {
    setRoomSetup(prev => {
      if (fn === 'default') {
        return prev.filter(r => r.index !== index);
      }
      const existing = prev.find(r => r.index === index);
      if (existing) {
        return prev.map(r => r.index === index ? { ...r, fn } : r);
      }
      return [...prev, { index, code: '', fn }];
    });
  };

  // ─── Room color for preview cells ──────────────────────────────
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

  // ─── Facility type label with account-awareness ──────────────────
  const getFacilityTypeLabel = (type: FacilityType) => {
    if (type === 'barn') return getHousingLabel();
    return t(`housing.facilityTypes.${type}`);
  };

  // ─── Reset form ──────────────────────────────
  const resetForm = () => {
    setName('');
    setNameAr('');
    setCode('');
    setFacilityType('barn');
    setUnitCount(6);
    setCodePrefix('S');
    setStartNumber(1);
    setLayoutMode('two_sided');
    setStartSide('a');
    setRoomSetup([]);
    setCapacity('');
    setBranchId(lockedBranchId || effectiveBranchId || '');
  };

  // ─── Submit ──────────────────────────────
  const handleSubmit = async () => {
    if (!name || !branchId) return;
    setIsSubmitting(true);

    try {
      const newArea = await createArea({
        branch_id: branchId,
        name,
        name_ar: nameAr || undefined,
        code: code || undefined,
        facility_type: facilityType,
        capacity: isOpenArea && capacity ? Number(capacity) : undefined,
      });

      if (isHousing && unitCount > 0 && newArea?.id) {
        const defaultUnitType = facilityType === 'isolation' ? 'isolation_room' : 'stall';

        for (const room of previewRooms) {
          const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
          await createUnit({
            branch_id: branchId,
            area_id: newArea.id,
            code: room.code,
            name: room.code,
            unit_type: unitType as any,
            occupancy: 'single',
            capacity: 1,
          });
        }
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Handled by mutation error handlers
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Two-sided layout helpers ──────────────────────────────
  const twoSidedRows = useMemo(() => {
    if (layoutMode !== 'two_sided') return null;
    const half = Math.ceil(previewRooms.length / 2);
    const rowA = previewRooms.slice(0, half);
    const rowB = previewRooms.slice(half);
    // If startSide is 'b', swap which side gets lower numbers
    if (startSide === 'b') {
      return { topRow: rowB, bottomRow: rowA };
    }
    return { topRow: rowA, bottomRow: rowB };
  }, [layoutMode, previewRooms, startSide]);

  // ─── Room cell component ──────────────────────────────
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
          <span className="opacity-70 leading-none mt-0.5">
            {getRoomFnLabel(room.fn)}
          </span>
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
                room.fn === opt.fn
                  ? "bg-accent font-medium"
                  : "hover:bg-muted"
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('housing.create.title')}</DialogTitle>
          <DialogDescription>{t('housing.create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Phase 1: Branch + Type ── */}
          <div className="space-y-4">
            {/* Branch */}
            <div className="space-y-2">
              <Label>{t('housing.facilities.branch')} *</Label>
              <Select
                value={branchId}
                onValueChange={setBranchId}
                disabled={!!lockedBranchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('housing.facilities.selectBranch')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Facility Type as visual selector */}
            <div className="space-y-2">
              <Label>{t('housing.facilities.facilityType')} *</Label>
              <div className="grid grid-cols-4 gap-2">
                {FACILITY_TYPES.map((type) => {
                  const Icon = FACILITY_ICONS[type];
                  const selected = facilityType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setFacilityType(type); setRoomSetup([]); }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                          : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] leading-tight text-center">
                        {getFacilityTypeLabel(type)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Phase 2: Identity ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.facilities.name')} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('housing.create.namePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.facilities.nameAr')}</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={t('housing.create.nameArPlaceholder')}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('housing.facilities.code')}</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('housing.facilities.codePlaceholder')}
                className="w-1/2"
              />
            </div>
          </div>

          {/* ── Phase 2b: Housing-specific fields ── */}
          {isHousing && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {isClinic ? t('housing.create.wardSetup') : t('housing.create.stallSetup')}
                  </h4>
                  <p className="text-xs text-muted-foreground">{t('housing.create.unitSetupDesc')}</p>
                </div>

                {/* Row 1: Count + Prefix + Start Number */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.create.unitCount')} *</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={unitCount}
                      onChange={(e) => setUnitCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.create.codePrefix')}</Label>
                    <Input
                      value={codePrefix}
                      onChange={(e) => setCodePrefix(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="S"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.create.startNumber')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                    />
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

                {/* Start Side Toggle — only visible in two-sided mode */}
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

                {/* Live Preview Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('housing.create.previewTitle')}</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {t('housing.create.clickToAssign')}
                    </span>
                  </div>

                  {layoutMode === 'two_sided' && twoSidedRows ? (
                    /* ── Two-sided arrangement with aisle + side labels ── */
                    <div className="p-3 bg-muted/30 rounded-lg border space-y-1">
                      {/* Side A label + row */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                          {t('housing.create.sideA')}
                        </span>
                        <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(60px, 1fr))` }}>
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
                      {/* Side B label + row */}
                      {twoSidedRows.bottomRow.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-10 shrink-0 text-center">
                            {t('housing.create.sideB')}
                          </span>
                          <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(60px, 1fr))` }}>
                            {twoSidedRows.bottomRow.map((room) => (
                              <RoomCell key={room.index} room={room} />
                            ))}
                            {/* Fill empty cells for alignment when odd count */}
                            {twoSidedRows.bottomRow.length < twoSidedRows.topRow.length && (
                              <div className="min-h-[48px]" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Single-row flat grid ── */
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
            </>
          )}

          {isOpenArea && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('housing.create.openAreaSetup')}</h4>
                  <p className="text-xs text-muted-foreground">{t('housing.create.openAreaSetupDesc')}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.create.approxCapacity')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder={t('housing.create.capacityPlaceholder')}
                    className="w-1/2"
                  />
                </div>
              </div>
            </>
          )}

          {(category === 'activity' || category === 'storage') && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>{t(`housing.create.${category}Note`)}</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !branchId || isCreating || isSubmitting}
          >
            {(isCreating || isSubmitting) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('common.create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Exported helpers for use by other components ──────────────────
export { FACILITY_CATEGORY, FACILITY_ICONS };
export type { FacilityCategory, RoomFunction, LayoutMode, StartSide };
