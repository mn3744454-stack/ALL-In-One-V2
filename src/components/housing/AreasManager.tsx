import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useLocations } from "@/hooks/movement/useLocations";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Plus, Map, Edit, Power, Loader2 } from "lucide-react";

export function AreasManager() {
  const { t, dir, lang: language } = useI18n();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    code: '',
    branch_id: '',
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
    setFormData({ name: '', name_ar: '', code: '', branch_id: '' });
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
        });
      } else {
        await createArea({
          branch_id: formData.branch_id,
          name: formData.name,
          name_ar: formData.name_ar || undefined,
          code: formData.code || undefined,
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
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('housing.areas.selectBranch')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('common.all')}</SelectItem>
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
            {t('housing.areas.addArea')}
          </Button>
        )}
      </div>

      {/* Areas Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Map className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('housing.areas.noAreas')}</p>
            {canManage && (
              <Button variant="link" onClick={() => handleOpenDialog()}>
                {t('housing.areas.addFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const displayName = language === 'ar' && area.name_ar ? area.name_ar : area.name;
            
            return (
              <Card 
                key={area.id} 
                className={cn(!area.is_active && "opacity-60")}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Map className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{displayName}</CardTitle>
                        {area.code && (
                          <p className="text-sm text-muted-foreground">{area.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingArea ? t('housing.areas.editArea') : t('housing.areas.addArea')}
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
              <Label>{t('housing.areas.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('housing.areas.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('housing.areas.nameAr')}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder={t('housing.areas.nameArPlaceholder')}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('housing.areas.code')}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder={t('housing.areas.codePlaceholder')}
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
