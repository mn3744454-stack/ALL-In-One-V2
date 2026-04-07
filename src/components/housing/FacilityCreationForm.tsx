import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { FACILITY_TYPES, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useLocations } from "@/hooks/movement/useLocations";
import { RoomLayoutSetup, type RoomLayoutConfig, type RoomSetup, type LayoutMode, type StartSide, type RoomFunction } from "./RoomLayoutSetup";
import {
  Building2, Fence, Dumbbell, Droplets,
  Warehouse, CircleDot, TreePine, ShieldAlert, Home,
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
  lockedBranchId?: string;
  defaultBranchId?: string;
  onValidityChange?: (valid: boolean) => void;
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
  // Room layout config from shared component
  const [roomConfig, setRoomConfig] = useState<RoomLayoutConfig | null>(null);
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

  const getHousingLabel = useCallback(() => {
    if (isClinic) return language === 'ar' ? 'عنبر' : 'Ward';
    return language === 'ar' ? 'جناح' : 'Stall Block';
  }, [isClinic, language]);

  const getFacilityTypeLabel = (type: FacilityType) => {
    if (type === 'barn') return getHousingLabel();
    return t(`housing.facilityTypes.${type}`);
  };

  const handleRoomConfigChange = useCallback((config: RoomLayoutConfig) => {
    setRoomConfig(config);
  }, []);

  // Notify parent of form data changes
  const formData: FacilityFormData = useMemo(() => ({
    branchId, facilityType, name, nameAr, code,
    unitCount: roomConfig?.unitCount || 6,
    codePrefix: roomConfig?.codePrefix || 'S',
    startNumber: roomConfig?.startNumber || 1,
    layoutMode: roomConfig?.layoutMode || 'two_sided',
    startSide: roomConfig?.startSide || 'a',
    roomSetup: roomConfig?.roomSetup || [],
    previewRooms: roomConfig?.previewRooms || [],
    capacity, areaSize, shade, hasWater,
    actDimensions, actDiameter, actCovered, actFooting, actWashPoints, actWaterType,
  }), [branchId, facilityType, name, nameAr, code, roomConfig, capacity, areaSize, shade, hasWater, actDimensions, actDiameter, actCovered, actFooting, actWashPoints, actWaterType]);

  useMemo(() => {
    onFormDataChange?.(formData);
    onValidityChange?.(isValid);
  }, [formData, isValid, onFormDataChange, onValidityChange]);

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
                onClick={() => setFacilityType(type)}
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

      {/* ── Housing-specific: shared RoomLayoutSetup ── */}
      {isHousing && (
        <>
          <Separator />
          <RoomLayoutSetup
            facilityType={facilityType}
            maxUnits={50}
            initialCount={6}
            initialPrefix="S"
            initialStartNumber={1}
            onChange={handleRoomConfigChange}
          />
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
