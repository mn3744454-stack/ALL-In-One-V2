import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FacilitySection } from "./FacilitySection";
import { CreateFacilityDialog } from "./CreateFacilityDialog";
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Edit dialog state (uses old simple form)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    facility_type: 'barn' as FacilityType,
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

  // Get all facility IDs for bulk unit+occupant fetch
  const facilityIds = useMemo(() => areas.filter(a => a.is_active).map(a => a.id), [areas]);
  const { facilityUnitsMap, isLoadingUnits } = useInlineFacilityUnits(facilityIds);

  const handleOpenEdit = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area) {
      setEditFormData({
        name: area.name,
        name_ar: area.name_ar || '',
        code: area.code || '',
        facility_type: area.facility_type || 'barn',
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

      {/* Edit Dialog — simple update form */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('housing.facilities.editFacility')}</DialogTitle>
            <DialogDescription>{t('housing.facilities.editFacilityDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label>{t('housing.facilities.code')}</Label>
              <Input
                value={editFormData.code}
                onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder={t('housing.facilities.codePlaceholder')}
              />
            </div>
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