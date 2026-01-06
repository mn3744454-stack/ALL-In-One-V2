import { useState, useMemo } from "react";
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
import { HousingStats } from "./HousingStats";
import { useHousingUnits, type HousingUnit, type CreateUnitData } from "@/hooks/housing/useHousingUnits";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { Plus, LayoutGrid, Loader2, Search } from "lucide-react";

// Strict allowlists - match DB enum only
const UNIT_TYPES = ['stall', 'paddock', 'room', 'cage', 'other'] as const;
const OCCUPANCY_MODES = ['single', 'group'] as const;

type UnitStatus = 'vacant' | 'occupied' | 'full';

function getUnitStatus(unit: HousingUnit): UnitStatus {
  const occupants = unit.current_occupants ?? 0;
  if (occupants === 0) return 'vacant';
  if (occupants >= unit.capacity) return 'full';
  return 'occupied';
}

export function UnitsManager() {
  const { t } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<HousingUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
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

  // Filtered units based on search and filters
  const filteredUnits = useMemo(() => {
    return (units || []).filter(unit => {
      const matchesSearch = !searchQuery || 
        unit.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !typeFilter || unit.unit_type === typeFilter;
      const matchesStatus = !statusFilter || getUnitStatus(unit) === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [units, searchQuery, typeFilter, statusFilter]);

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
      {/* Stats */}
      <HousingStats units={units || []} />

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('housing.units.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedBranchId || "__all__"} onValueChange={(v) => {
            setSelectedBranchId(v === "__all__" ? "" : v);
            setSelectedAreaId('');
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
            <SelectTrigger className="w-full sm:w-[180px]">
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

          <Select value={typeFilter || "__all__"} onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t('housing.units.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('housing.units.allTypes')}</SelectItem>
              {UNIT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`housing.units.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t('housing.units.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('housing.units.allStatuses')}</SelectItem>
              <SelectItem value="vacant">{t('housing.units.status.vacant')}</SelectItem>
              <SelectItem value="occupied">{t('housing.units.status.occupied')}</SelectItem>
              <SelectItem value="full">{t('housing.units.status.full')}</SelectItem>
            </SelectContent>
          </Select>

          {canManage && (
            <Button className="gap-2 sm:ms-auto" onClick={handleOpenDialog}>
              <Plus className="w-4 h-4" />
              {t('housing.units.addUnit')}
            </Button>
          )}
        </div>
      </div>

      {/* Units Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutGrid className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('housing.units.noUnits')}</p>
            {canManage && !searchQuery && !typeFilter && !statusFilter && (
              <Button variant="link" onClick={handleOpenDialog}>
                {t('housing.units.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => (
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
