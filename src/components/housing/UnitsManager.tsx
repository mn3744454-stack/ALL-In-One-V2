import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnitCard } from "./UnitCard";
import { UnitDetailsSheet } from "./UnitDetailsSheet";
import { useHousingUnits, type HousingUnit, type CreateUnitData } from "@/hooks/housing/useHousingUnits";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { Plus, LayoutGrid, Loader2 } from "lucide-react";

const UNIT_TYPES = ['stall', 'paddock', 'room', 'cage', 'other'] as const;
const OCCUPANCY_MODES = ['single', 'group'] as const;

export function UnitsManager() {
  const { t } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<HousingUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateUnitData>>({
    branch_id: '',
    area_id: '',
    code: '',
    name: '',
    name_ar: '',
    unit_type: 'stall',
    occupancy: 'single',
    capacity: 1,
    notes: '',
  });

  const { activeLocations } = useLocations();
  const { activeAreas } = useFacilityAreas(selectedBranchId || undefined);
  const { 
    units, 
    isLoading, 
    canManage, 
    createUnit,
    isCreating,
  } = useHousingUnits(selectedBranchId || undefined, selectedAreaId || undefined);

  const formAreas = useFacilityAreas(formData.branch_id || undefined).activeAreas;

  const resetForm = () => {
    setFormData({
      branch_id: selectedBranchId || '',
      area_id: '',
      code: '',
      name: '',
      name_ar: '',
      unit_type: 'stall',
      occupancy: 'single',
      capacity: 1,
      notes: '',
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleViewDetails = (unit: HousingUnit) => {
    setSelectedUnit(unit);
    setDetailsOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.branch_id || !formData.area_id || !formData.code || !formData.unit_type || !formData.occupancy) return;

    try {
      await createUnit({
        branch_id: formData.branch_id,
        area_id: formData.area_id,
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        unit_type: formData.unit_type as CreateUnitData['unit_type'],
        occupancy: formData.occupancy as CreateUnitData['occupancy'],
        capacity: formData.occupancy === 'single' ? 1 : (formData.capacity || 10),
        notes: formData.notes,
      });
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
        <Select value={selectedBranchId || "__all__"} onValueChange={(v) => {
          setSelectedBranchId(v === "__all__" ? "" : v);
          setSelectedAreaId('');
        }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('housing.areas.selectBranch')} />
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

        <Select value={selectedAreaId || "__all__"} onValueChange={(v) => setSelectedAreaId(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('housing.units.selectArea')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('common.all')}</SelectItem>
            {activeAreas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && (
          <Button className="gap-2 sm:ms-auto" onClick={handleOpenDialog}>
            <Plus className="w-4 h-4" />
            {t('housing.units.addUnit')}
          </Button>
        )}
      </div>

      {/* Units Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : units.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutGrid className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('housing.units.noUnits')}</p>
            {canManage && (
              <Button variant="link" onClick={handleOpenDialog}>
                {t('housing.units.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <UnitCard 
              key={unit.id} 
              unit={unit} 
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Add Unit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('housing.units.addUnit')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
            <div className="space-y-2">
              <Label>{t('movement.locations.branch')} *</Label>
              <Select 
                value={formData.branch_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, branch_id: v, area_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('housing.areas.selectBranch')} />
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
              <Label>{t('housing.areas.title')} *</Label>
              <Select 
                value={formData.area_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, area_id: v }))}
                disabled={!formData.branch_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('housing.units.selectArea')} />
                </SelectTrigger>
                <SelectContent>
                  {formAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('housing.units.code')} *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="A01"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('housing.units.unitType')} *</Label>
                <Select 
                  value={formData.unit_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unit_type: v as CreateUnitData['unit_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`housing.units.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('housing.units.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('housing.units.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('housing.units.nameAr')}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder={t('housing.units.nameArPlaceholder')}
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('housing.units.occupancy')}</Label>
                <Select 
                  value={formData.occupancy} 
                  onValueChange={(v) => setFormData(prev => ({ 
                    ...prev, 
                    occupancy: v as CreateUnitData['occupancy'],
                    capacity: v === 'single' ? 1 : 10,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPANCY_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {t(`housing.units.occupancyModes.${mode}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.occupancy === 'group' && (
                <div className="space-y-2">
                  <Label>{t('housing.units.capacity')}</Label>
                  <Input
                    type="number"
                    min={2}
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.branch_id || !formData.area_id || !formData.code || isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Details Sheet */}
      <UnitDetailsSheet
        unit={selectedUnit}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
