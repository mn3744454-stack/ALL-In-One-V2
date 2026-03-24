import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FacilitySection } from "./FacilitySection";
import { useFacilityAreas, FACILITY_TYPES, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { useInlineFacilityUnits } from "@/hooks/housing/useInlineFacilityUnits";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { Plus, Building2, Loader2 } from "lucide-react";

interface FacilitiesManagerProps {
  lockedBranchId?: string;
}

export function FacilitiesManager({ lockedBranchId }: FacilitiesManagerProps) {
  const { t } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(lockedBranchId || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    branch_id: lockedBranchId || '',
    facility_type: 'barn' as FacilityType,
  });

  const effectiveBranchId = lockedBranchId || selectedBranchId;

  const { activeLocations } = useLocations();
  const {
    areas,
    isLoading,
    canManage,
    createArea,
    updateArea,
    toggleAreaActive,
    isCreating,
    isUpdating,
  } = useFacilityAreas(effectiveBranchId || undefined);

  // Get all facility IDs for bulk unit+occupant fetch
  const facilityIds = useMemo(() => areas.filter(a => a.is_active).map(a => a.id), [areas]);
  const { facilityUnitsMap, isLoadingUnits } = useInlineFacilityUnits(facilityIds);

  const resetForm = () => {
    setFormData({ name: '', name_ar: '', code: '', branch_id: lockedBranchId || '', facility_type: 'barn' });
    setEditingArea(null);
  };

  const handleOpenDialog = (areaId?: string) => {
    if (areaId) {
      const area = areas.find(a => a.id === areaId);
      if (area) {
        setFormData({
          name: area.name,
          name_ar: area.name_ar || '',
          code: area.code || '',
          branch_id: area.branch_id,
          facility_type: area.facility_type || 'barn',
        });
        setEditingArea(areaId);
      }
    } else {
      resetForm();
      if (effectiveBranchId) {
        setFormData(prev => ({ ...prev, branch_id: effectiveBranchId }));
      }
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.branch_id) return;

    try {
      if (editingArea) {
        await updateArea({
          id: editingArea,
          name: formData.name,
          name_ar: formData.name_ar || undefined,
          code: formData.code || undefined,
          facility_type: formData.facility_type,
        });
      } else {
        await createArea({
          branch_id: formData.branch_id,
          name: formData.name,
          name_ar: formData.name_ar || undefined,
          code: formData.code || undefined,
          facility_type: formData.facility_type,
        });
      }
      setDialogOpen(false);
      resetForm();
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
            <SelectTrigger className="w-full sm:w-[200px]">
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
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
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
              <Button variant="link" onClick={() => handleOpenDialog()}>
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
              onEdit={handleOpenDialog}
              onToggleActive={toggleAreaActive}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingArea ? t('housing.facilities.editFacility') : t('housing.facilities.addFacility')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('movement.locations.branch')} *</Label>
              <Select
                value={formData.branch_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, branch_id: v }))}
                disabled={!!editingArea || !!lockedBranchId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('housing.facilities.selectBranch')} />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('housing.facilities.facilityType')} *</Label>
              <Select
                value={formData.facility_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, facility_type: v as FacilityType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`housing.facilityTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('housing.facilities.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('housing.facilities.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('housing.facilities.nameAr')}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder={t('housing.facilities.nameArPlaceholder')}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('housing.facilities.code')}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder={t('housing.facilities.codePlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.branch_id || isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingArea ? (
                t('common.update')
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
