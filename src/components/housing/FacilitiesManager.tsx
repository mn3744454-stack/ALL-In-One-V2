import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FacilitySection } from "./FacilitySection";
import { CreateFacilityDialog, FACILITY_CATEGORY } from "./CreateFacilityDialog";
import { useFacilityAreas, SUBDIVISION_CONFIG, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useInlineFacilityUnits } from "@/hooks/housing/useInlineFacilityUnits";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { Plus, Building2, Loader2, Home, ShieldAlert } from "lucide-react";

interface FacilitiesManagerProps {
  lockedBranchId?: string;
}

export function FacilitiesManager({ lockedBranchId }: FacilitiesManagerProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type || 'stable';
  const isClinic = tenantType === 'clinic' || tenantType === 'doctor';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(lockedBranchId || '');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    facility_type: 'barn' as FacilityType,
    capacity: '' as number | '',
    area_size: '' as number | '',
    shade: 'none',
    has_water: false,
    metadata: {} as Record<string, unknown>,
  });

  const effectiveBranchId = lockedBranchId || selectedBranchId;

  const { activeLocations } = useLocations();
  const {
    areas,
    isLoading,
    canManage,
    updateArea,
    toggleAreaActive,
    isUpdating,
  } = useFacilityAreas(effectiveBranchId || undefined);

  const facilityIds = useMemo(() => areas.filter(a => a.is_active).map(a => a.id), [areas]);
  const { facilityUnitsMap, isLoadingUnits } = useInlineFacilityUnits(facilityIds);

  const getEditTypeLabel = useCallback(() => {
    const ft = editFormData.facility_type;
    if (ft === 'barn') {
      if (isClinic) return lang === 'ar' ? 'عنبر' : 'Ward';
      return lang === 'ar' ? 'جناح' : 'Stall Block';
    }
    return t(`housing.facilityTypes.${ft}`);
  }, [editFormData.facility_type, isClinic, lang, t]);

  const editFacilityCategory = FACILITY_CATEGORY[editFormData.facility_type];
  const editIsHousing = editFacilityCategory === 'housing';
  const editIsOpenArea = editFacilityCategory === 'open_area';
  const editIsActivity = editFacilityCategory === 'activity';
  const editUnitCount = editingArea ? (facilityUnitsMap[editingArea]?.totalCount || 0) : 0;
  const editOccupiedCount = editingArea ? (facilityUnitsMap[editingArea]?.occupiedCount || 0) : 0;

  const handleOpenEdit = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area) {
      setEditFormData({
        name: area.name,
        name_ar: area.name_ar || '',
        code: area.code || '',
        facility_type: area.facility_type || 'barn',
        capacity: area.capacity ?? '',
        area_size: (area as any).area_size ?? '',
        shade: (area as any).shade || 'none',
        has_water: (area as any).has_water || false,
      });
      setEditingArea(areaId);
      setEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingArea || !editFormData.name) return;
    try {
      await updateArea({
        id: editingArea,
        name: editFormData.name,
        name_ar: editFormData.name_ar || undefined,
        code: editFormData.code || undefined,
        facility_type: editFormData.facility_type,
        capacity: editIsOpenArea && editFormData.capacity ? Number(editFormData.capacity) : undefined,
        area_size: editIsOpenArea && editFormData.area_size ? Number(editFormData.area_size) : undefined,
        shade: editIsOpenArea ? editFormData.shade : undefined,
        has_water: editIsOpenArea ? editFormData.has_water : undefined,
      });
      setEditDialogOpen(false);
      setEditingArea(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {!lockedBranchId && (
          <Select value={selectedBranchId || "__all__"} onValueChange={(v) => setSelectedBranchId(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder={t('housing.facilities.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {activeLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canManage && (
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('housing.facilities.addFacility')}
          </Button>
        )}
      </div>

      {/* Inline Facility Sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('housing.facilities.noFacilities')}</p>
            {canManage && (
              <Button variant="link" onClick={() => setCreateDialogOpen(true)}>
                {t('housing.facilities.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {areas.map((area) => (
            <FacilitySection
              key={area.id}
              facility={area}
              facilityData={facilityUnitsMap[area.id]}
              isLoadingUnits={isLoadingUnits}
              canManage={canManage}
              onEdit={handleOpenEdit}
              onToggleActive={toggleAreaActive}
            />
          ))}
        </div>
      )}

      {/* Create Dialog — type-driven */}
      <CreateFacilityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        lockedBranchId={lockedBranchId}
        effectiveBranchId={effectiveBranchId}
      />

      {/* Edit Dialog — type-aware */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t('housing.facilities.editFacility')}
              <Badge variant="outline" className="text-[10px] capitalize">
                {getEditTypeLabel()}
              </Badge>
            </DialogTitle>
            <DialogDescription>{t('housing.facilities.editFacilityDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('housing.facilities.name')} *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('housing.facilities.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('housing.facilities.nameAr')}</Label>
                <Input
                  value={editFormData.name_ar}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                  placeholder={t('housing.facilities.nameArPlaceholder')}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('housing.facilities.code')}</Label>
              <Input
                value={editFormData.code}
                onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder={t('housing.facilities.codePlaceholder')}
              />
            </div>

            {/* Type-aware context info */}
            {editIsHousing && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                {editFormData.facility_type === 'isolation' ? (
                  <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
                ) : (
                  <Home className="w-5 h-5 text-primary shrink-0" />
                )}
                <div className="text-sm">
                  <span className="font-medium">{editUnitCount}</span>
                  <span className="text-muted-foreground ml-1">{t('housing.create.editUnitsInfo')}</span>
                  {editOccupiedCount > 0 && (
                    <span className="text-muted-foreground"> · <span className="font-medium">{editOccupiedCount}</span> {t('housing.facilities.occupancy').toLowerCase()}</span>
                  )}
                </div>
              </div>
            )}

            {/* Open-area edit fields */}
            {editIsOpenArea && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.create.approxCapacity')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editFormData.capacity}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, capacity: e.target.value ? parseInt(e.target.value) : '' }))}
                      placeholder={t('housing.create.capacityPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.openArea.areaSizeLabel')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editFormData.area_size}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, area_size: e.target.value ? parseFloat(e.target.value) : '' }))}
                      placeholder={t('housing.openArea.areaSizePlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('housing.openArea.shadeLabel')}</Label>
                    <Select value={editFormData.shade} onValueChange={(v) => setEditFormData(prev => ({ ...prev, shade: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('housing.openArea.shadeNone')}</SelectItem>
                        <SelectItem value="partial">{t('housing.openArea.shadePartial')}</SelectItem>
                        <SelectItem value="full">{t('housing.openArea.shadeFull')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.has_water}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, has_water: e.target.checked }))}
                        className="rounded border-border"
                      />
                      {t('housing.openArea.waterAvailable')}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editFormData.name || isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
