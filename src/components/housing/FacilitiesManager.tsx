import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFacilityAreas, FACILITY_TYPES, SUBDIVISION_CONFIG, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { UnitsManager } from "./UnitsManager";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Plus, Building2, Edit, Power, Loader2, LayoutGrid, ChevronRight } from "lucide-react";

export function FacilitiesManager() {
  const { t, dir, lang: language } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [unitsSheetFacility, setUnitsSheetFacility] = useState<{ id: string; name: string; facilityType: FacilityType } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    branch_id: '',
    facility_type: 'barn' as FacilityType,
  });

  const { activeLocations } = useLocations();
  const { 
    areas, 
    isLoading, 
    canManage, 
    createArea, 
    updateArea, 
    toggleAreaActive,
    isCreating, 
    isUpdating 
  } = useFacilityAreas(selectedBranchId || undefined);

  const resetForm = () => {
    setFormData({ name: '', name_ar: '', code: '', branch_id: '', facility_type: 'barn' });
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
      if (selectedBranchId) {
        setFormData(prev => ({ ...prev, branch_id: selectedBranchId }));
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

        {canManage && (
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4" />
            {t('housing.facilities.addFacility')}
          </Button>
        )}
      </div>

      {/* Facilities Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const displayName = language === 'ar' && area.name_ar ? area.name_ar : area.name;
            const config = SUBDIVISION_CONFIG[area.facility_type as FacilityType] || SUBDIVISION_CONFIG.other;
            
            return (
              <Card 
                key={area.id} 
                className={cn(!area.is_active && "opacity-60")}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{displayName}</CardTitle>
                        {area.code && (
                          <p className="text-sm text-muted-foreground">{area.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {t(`housing.facilityTypes.${area.facility_type}`)}
                      </Badge>
                      {area.is_demo && (
                        <Badge variant="outline" className="text-xs">Demo</Badge>
                      )}
                      {!area.is_active && (
                        <Badge variant="secondary" className="text-xs">{t('common.inactive')}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {area.branch && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {area.branch.name}
                    </p>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    {/* Manage internal structure — only for facility types that support children */}
                    {config.supportsChildren && canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setUnitsSheetFacility({
                          id: area.id,
                          name: displayName,
                          facilityType: area.facility_type as FacilityType,
                        })}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {t(`housing.facilities.${getManageKey(area.facility_type as FacilityType)}`)}
                        <ChevronRight className={cn("w-3.5 h-3.5 ms-auto", dir === 'rtl' && "rotate-180")} />
                      </Button>
                    )}

                    {canManage && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1"
                          onClick={() => handleOpenDialog(area.id)}
                        >
                          <Edit className="w-3 h-3" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "gap-1",
                            area.is_active ? "text-destructive" : "text-emerald-600"
                          )}
                          onClick={() => toggleAreaActive({ 
                            id: area.id, 
                            isActive: !area.is_active 
                          })}
                        >
                          <Power className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Units Sheet — contextual unit management for a selected facility */}
      <Sheet open={!!unitsSheetFacility} onOpenChange={(open) => { if (!open) setUnitsSheetFacility(null); }}>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-lg md:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              {unitsSheetFacility?.name} — {t('housing.facilities.manageSubdivisions')}
            </SheetTitle>
          </SheetHeader>
          {unitsSheetFacility && (
            <div className="mt-4">
              <UnitsManager
                lockedBranchId={selectedBranchId || undefined}
                lockedAreaId={unitsSheetFacility.id}
                facilityType={unitsSheetFacility.facilityType}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

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
                disabled={!!editingArea}
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
