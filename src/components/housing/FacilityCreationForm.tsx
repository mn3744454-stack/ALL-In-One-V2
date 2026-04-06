import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { FACILITY_TYPES, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useLocations } from "@/hooks/movement/useLocations";
import {
  Building2, Fence, Dumbbell, Droplets,
  Warehouse, CircleDot, TreePine, ShieldAlert, Home,
  LayoutGrid, Rows3, Package, Lock
} from "lucide-react";

// ─── Facility category classification ──────────────────────────────
export type FacilityCategory = 'housing' | 'open_area' | 'activity' | 'storage';

export const FACILITY_CATEGORY: Record<FacilityType, FacilityCategory> = {
  barn: 'housing',
  isolation: 'housing',
  paddock: 'open_area',
  pasture: 'open_area',
  arena: 'activity',
  round_pen: 'activity',
  wash_area: 'activity',
  storage: 'storage',
};

export const FACILITY_ICONS: Record<FacilityType, React.ElementType> = {
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
export type RoomFunction = 'default' | 'storage' | 'isolation_room';
export type LayoutMode = 'single' | 'two_sided';
export type StartSide = 'a' | 'b';

interface RoomSetup {
  index: number;
  code: string;
  fn: RoomFunction;
}

// ─── Form data structure exposed to consumers ──────────────────────
export interface FacilityFormData {
  branchId: string;
  facilityType: FacilityType;
  name: string;
  nameAr: string;
  code: string;
  // Housing
  unitCount: number;
  codePrefix: string;
  startNumber: number;
  layoutMode: LayoutMode;
  startSide: StartSide;
  roomSetup: RoomSetup[];
  previewRooms: RoomSetup[];
  // Open-area
  capacity: number | '';
  areaSize: number | '';
  shade: string;
  hasWater: boolean;
  // Activity
  actDimensions: string;
  actDiameter: string;
  actCovered: string;
  actFooting: string;
  actWashPoints: number | '';
  actWaterType: string;
}

// ─── Props ──────────────────────────────
interface FacilityCreationFormProps {
  /** If set, branch is locked and the branch selector is hidden */
  lockedBranchId?: string;
  /** Used as default branch when not locked */
  defaultBranchId?: string;
  /** Called whenever form validity changes */
  onValidityChange?: (valid: boolean) => void;
  /** Ref-like callback to expose form data to parent */
  onFormDataChange?: (data: FacilityFormData) => void;
}

export function FacilityCreationForm({
  lockedBranchId,
  defaultBranchId,
  onValidityChange,
  onFormDataChange,
}: FacilityCreationFormProps) {
  const { t, lang: language } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';

  const { activeLocations } = useLocations();

  // ─── Form state ──────────────────────────────
  const [branchId, setBranchId] = useState(lockedBranchId || defaultBranchId || '');
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
  // Activity-specific
  const [actDimensions, setActDimensions] = useState('');
  const [actDiameter, setActDiameter] = useState('');
  const [actCovered, setActCovered] = useState('uncovered');
  const [actFooting, setActFooting] = useState('sand');
  const [actWashPoints, setActWashPoints] = useState<number | ''>(1);
  const [actWaterType, setActWaterType] = useState('cold');

  const category = FACILITY_CATEGORY[facilityType];
  const isHousing = category === 'housing';
  const isOpenArea = category === 'open_area';
  const isActivity = category === 'activity';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';

  const isValid = !!name && !!branchId;

  // ─── Account-type-aware label for housing types ──────────────────
  const getHousingLabel = useCallback(() => {
    if (isClinic) return language === 'ar' ? 'عنبر' : 'Ward';
    return language === 'ar' ? 'جناح' : 'Stall Block';
  }, [isClinic, language]);

  const getRoomDefaultLabel = useCallback(() => {
    if (facilityType === 'isolation') return t('housing.create.roomIsolationDefault');
    if (isClinic) return t('housing.create.roomPatient');
    return t('housing.create.roomDefault');
  }, [facilityType, isClinic, t]);

  // ─── Generate preview rooms ──────────────────────────────
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

  // Notify parent of form data changes
  const formData: FacilityFormData = useMemo(() => ({
    branchId, facilityType, name, nameAr, code,
    unitCount, codePrefix, startNumber, layoutMode, startSide, roomSetup, previewRooms,
    capacity, areaSize, shade, hasWater,
    actDimensions, actDiameter, actCovered, actFooting, actWashPoints, actWaterType,
  }), [branchId, facilityType, name, nameAr, code, unitCount, codePrefix, startNumber, layoutMode, startSide, roomSetup, previewRooms, capacity, areaSize, shade, hasWater, actDimensions, actDiameter, actCovered, actFooting, actWashPoints, actWaterType]);

  // Push data to parent on every render
  useMemo(() => {
    onFormDataChange?.(formData);
    onValidityChange?.(isValid);
  }, [formData, isValid, onFormDataChange, onValidityChange]);

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

  const getFacilityTypeLabel = (type: FacilityType) => {
    if (type === 'barn') return getHousingLabel();
    return t(`housing.facilityTypes.${type}`);
  };

  // ─── Two-sided layout helpers ──────────────────────────────
  const twoSidedRows = useMemo(() => {
    if (layoutMode !== 'two_sided') return null;
    const half = Math.ceil(previewRooms.length / 2);
    const rowA = previewRooms.slice(0, half);
    const rowB = previewRooms.slice(half);
    if (startSide === 'b') return { topRow: rowB, bottomRow: rowA };
    return { topRow: rowA, bottomRow: rowB };
  }, [layoutMode, previewRooms, startSide]);

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
    <div className="space-y-5">
      {/* ── Branch selector (hidden when locked) ── */}
      {!lockedBranchId && (
        <div className="space-y-2">
          <Label>{t('housing.facilities.branch')} *</Label>
          <Select value={branchId} onValueChange={setBranchId}>
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
      )}

      {/* ── Facility Type as visual selector ── */}
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

      <Separator />

      {/* ── Identity fields ── */}
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

      {/* ── Housing-specific fields ── */}
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

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.create.unitCount')} *</Label>
                <Input
                  type="number" min={1} max={50}
                  value={unitCount}
                  onChange={(e) => setUnitCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
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
                    <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(60px, 1fr))` }}>
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
                      <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${twoSidedRows.topRow.length}, minmax(60px, 1fr))` }}>
                        {twoSidedRows.bottomRow.map((room) => <RoomCell key={room.index} room={room} />)}
                        {twoSidedRows.bottomRow.length < twoSidedRows.topRow.length && <div className="min-h-[48px]" />}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5 p-3 bg-muted/30 rounded-lg border">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.create.approxCapacity')}</Label>
                <Input type="number" min={1} max={200} value={capacity}
                  onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder={t('housing.create.capacityPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.openArea.areaSizeLabel')}</Label>
                <Input type="number" min={1} value={areaSize}
                  onChange={(e) => setAreaSize(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={t('housing.openArea.areaSizePlaceholder')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.openArea.shadeLabel')}</Label>
                <Select value={shade} onValueChange={setShade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('housing.openArea.shadeNone')}</SelectItem>
                    <SelectItem value="partial">{t('housing.openArea.shadePartial')}</SelectItem>
                    <SelectItem value="full">{t('housing.openArea.shadeFull')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={hasWater} onChange={(e) => setHasWater(e.target.checked)} className="rounded border-border" />
                  {t('housing.openArea.waterAvailable')}
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {isActivity && (
        <>
          <Separator />
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">{t('housing.activity.setupTitle')}</h4>
              <p className="text-xs text-muted-foreground">{t('housing.activity.setupDesc')}</p>
            </div>
            {facilityType === 'arena' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.activity.dimensions')}</Label>
                <Input value={actDimensions} onChange={(e) => setActDimensions(e.target.value)}
                  placeholder={t('housing.activity.dimensionsPlaceholder')} />
              </div>
            )}
            {facilityType === 'round_pen' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.activity.diameter')}</Label>
                <Input value={actDiameter} onChange={(e) => setActDiameter(e.target.value)}
                  placeholder={t('housing.activity.diameterPlaceholder')} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('housing.activity.coveredLabel')}</Label>
                <Select value={actCovered} onValueChange={setActCovered}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="covered">{t('housing.activity.covered')}</SelectItem>
                    <SelectItem value="uncovered">{t('housing.activity.uncovered')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {facilityType !== 'wash_area' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.activity.footingLabel')}</Label>
                  <Select value={actFooting} onValueChange={setActFooting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['sand', 'grass', 'rubber', 'dirt', 'synthetic'].map(f => (
                        <SelectItem key={f} value={f}>{t(`housing.activity.footing_${f}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {facilityType === 'wash_area' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.activity.washPoints')}</Label>
                  <Input type="number" min={1} max={20} value={actWashPoints}
                    onChange={(e) => setActWashPoints(e.target.value ? parseInt(e.target.value) : '')} placeholder="1" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('housing.activity.waterTypeLabel')}</Label>
                  <Select value={actWaterType} onValueChange={setActWaterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">{t('housing.activity.water_cold')}</SelectItem>
                      <SelectItem value="hot_cold">{t('housing.activity.water_hot_cold')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {category === 'storage' && (
        <>
          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>{t('housing.create.storageNote')}</span>
          </div>
        </>
      )}
    </div>
  );
}
