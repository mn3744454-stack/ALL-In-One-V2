import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVaccinationPrograms, type CreateProgramData } from "@/hooks/vet/useVaccinationPrograms";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BilingualName } from "@/components/ui/BilingualName";
import { useI18n } from "@/i18n";
import { tStatus } from "@/i18n/labels";

export function VaccinationProgramManager() {
  const { t } = useI18n();
  const { programs, loading, canManage, createProgram, updateProgram, deleteProgram } = useVaccinationPrograms();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateProgramData>({
    name: '', name_ar: '', is_active: true, default_interval_days: undefined, age_min_days: undefined, notes: '',
  });

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setFormData({ name: '', name_ar: '', is_active: true, default_interval_days: undefined, age_min_days: undefined, notes: '' });
    setShowDialog(true);
  };

  const handleOpenEdit = (program: typeof programs[0]) => {
    setEditingProgram(program.id);
    setFormData({
      name: program.name, name_ar: program.name_ar || '', is_active: program.is_active,
      default_interval_days: program.default_interval_days || undefined, age_min_days: program.age_min_days || undefined, notes: program.notes || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);
    try {
      if (editingProgram) { await updateProgram(editingProgram, formData); }
      else { await createProgram(formData); }
      setShowDialog(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("vet.programs.deleteConfirm"))) {
      await deleteProgram(id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32 rounded-xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("vet.programs.addVaccine")}
          </Button>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Syringe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t("vet.emptyMessages.vaccinations")}</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenCreate}>
              {t("vet.programs.addVaccine")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BilingualName name={program.name} nameAr={program.name_ar} primaryClassName="font-medium" />
                      <Badge variant={program.is_active ? "default" : "secondary"}>
                        {tStatus(program.is_active ? 'active' : 'inactive')}
                      </Badge>
                    </div>
                    {program.default_interval_days && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("vet.programs.repeatEvery").replace('{days}', String(program.default_interval_days))}
                      </p>
                    )}
                    {program.age_min_days && (
                      <p className="text-xs text-muted-foreground">
                        {t("vet.programs.minAgeLabel").replace('{days}', String(program.age_min_days))}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(program)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(program.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? t("vet.programs.editProgram") : t("vet.programs.newProgram")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("vet.programs.name")} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tetanus, Influenza" />
            </div>

            <div className="space-y-2">
              <Label>{t("vet.programs.nameAr")}</Label>
              <Input value={formData.name_ar || ''} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} placeholder="الاسم بالعربية" dir="rtl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("vet.programs.interval")}</Label>
                <Input type="number" value={formData.default_interval_days || ''} onChange={(e) => setFormData({ ...formData, default_interval_days: e.target.value ? Number(e.target.value) : undefined })} placeholder={t("vet.programs.intervalPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("vet.programs.minAge")}</Label>
                <Input type="number" value={formData.age_min_days || ''} onChange={(e) => setFormData({ ...formData, age_min_days: e.target.value ? Number(e.target.value) : undefined })} placeholder={t("vet.programs.minAgePlaceholder")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("vet.form.notes")}</Label>
              <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={t("vet.form.notesPlaceholder")} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label>{tStatus('active')}</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>{t("common.cancel")}</Button>
              <Button type="submit" className="flex-1" disabled={submitting || !formData.name}>
                {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {editingProgram ? t("common.update") : t("common.create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
