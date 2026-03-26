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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useFacilityAreas, FACILITY_TYPES, SUBDIVISION_CONFIG, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits, type CreateUnitData } from "@/hooks/housing/useHousingUnits";
import { useLocations } from "@/hooks/movement/useLocations";
import {
  Loader2, Building2, Fence, Dumbbell, Droplets,
  Warehouse, CircleDot, TreePine, ShieldAlert, Home
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
  const [roomSetup, setRoomSetup] = useState<RoomSetup[]>([]);
  // Open-area specific
  const [capacity, setCapacity] = useState<number | ''>('');
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const category = FACILITY_CATEGORY[facilityType];
  const isHousing = category === 'housing';
  const isOpenArea = category === 'open_area';

  // ─── Account-type-aware label for housing types ──────────────────
  const getHousingLabel = useCallback(() => {
    if (tenantType === 'clinic' || tenantType === 'doctor') {
      return language === 'ar' ? 'عنبر' : 'Ward';
    }
    return language === 'ar' ? 'جناح' : 'Stall Block';
  }, [tenantType, language]);

  // ─── Generate preview rooms when count/prefix changes ──────────────
  const previewRooms = useMemo(() => {
    const count = Math.max(1, Math.min(unitCount || 1, 50));
    const rooms: RoomSetup[] = [];
    for (let i = 0; i < count; i++) {
      const existingSetup = roomSetup.find(r => r.index === i);
      rooms.push({
        index: i,
        code: `${codePrefix}${String(i + 1).padStart(2, '0')}`,
        fn: existingSetup?.fn || 'default',
      });
    }
    return rooms;
  }, [unitCount, codePrefix, roomSetup]);

  // ─── Room exception toggle ──────────────────────────────
  const toggleRoomFunction = (index: number) => {
    setRoomSetup(prev => {
      const existing = prev.find(r => r.index === index);
      const cycle: RoomFunction[] = ['default', 'storage', 'isolation_room'];
      const currentFn = existing?.fn || 'default';
      const nextIdx = (cycle.indexOf(currentFn) + 1) % cycle.length;
      const nextFn = cycle[nextIdx];

      if (nextFn === 'default') {
        return prev.filter(r => r.index !== index);
      }
      if (existing) {
        return prev.map(r => r.index === index ? { ...r, fn: nextFn } : r);
      }
      return [...prev, { index, code: `${codePrefix}${String(index + 1).padStart(2, '0')}`, fn: nextFn }];
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
      default: return isHousing && facilityType === 'isolation'
        ? t('housing.create.roomIsolationDefault')
        : t('housing.create.roomDefault');
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
    setRoomSetup([]);
    setCapacity('');
    setBranchId(lockedBranchId || effectiveBranchId || '');
  };

  // ─── Submit ──────────────────────────────
  const handleSubmit = async () => {
    if (!name || !branchId) return;
    setIsSubmitting(true);

    try {
      // 1. Create the facility
      const newArea = await createArea({
        branch_id: branchId,
        name,
        name_ar: nameAr || undefined,
        code: code || undefined,
        facility_type: facilityType,
        capacity: isOpenArea && capacity ? Number(capacity) : undefined,
      });

      // 2. For housing types, batch-create units
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

          {/* ── Phase 2b: Type-specific fields ── */}
          {isHousing && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">{t('housing.create.unitSetup')}</h4>
                  <p className="text-xs text-muted-foreground">{t('housing.create.unitSetupDesc')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* Live Preview Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('housing.create.previewTitle')}</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {t('housing.create.clickToToggle')}
                    </span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-1.5 p-3 bg-muted/30 rounded-lg border">
                    {previewRooms.map((room) => (
                      <button
                        key={room.index}
                        type="button"
                        onClick={() => toggleRoomFunction(room.index)}
                        className={cn(
                          "flex flex-col items-center justify-center p-1.5 rounded-md border text-[10px] transition-all hover:scale-105 cursor-pointer min-h-[44px]",
                          getRoomColor(room.fn)
                        )}
                      >
                        <span className="font-mono font-semibold text-[11px]">{room.code}</span>
                        <span className="opacity-70 leading-none mt-0.5">
                          {getRoomFnLabel(room.fn)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
                      {facilityType === 'isolation' ? t('housing.create.roomIsolationDefault') : t('housing.create.roomDefault')}
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

          {/* Activity/Storage: no extra fields, just a note */}
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