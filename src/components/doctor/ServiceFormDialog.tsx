import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctorServices, type DoctorService } from "@/hooks/doctor/useDoctorServices";
import { useI18n } from "@/i18n";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: DoctorService | null;
}

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const { createService, updateService, isCreating, isUpdating } = useDoctorServices();
  const { t } = useI18n();
  const isEdit = !!service;

  const [name, setName] = useState(service?.name || "");
  const [nameAr, setNameAr] = useState(service?.name_ar || "");
  const [description, setDescription] = useState(service?.description || "");
  const [basePrice, setBasePrice] = useState(service?.base_price?.toString() || "0");
  const [category, setCategory] = useState(service?.category || "");

  const resetForm = () => {
    setName(service?.name || "");
    setNameAr(service?.name_ar || "");
    setDescription(service?.description || "");
    setBasePrice(service?.base_price?.toString() || "0");
    setCategory(service?.category || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
      description: description || undefined,
      base_price: parseFloat(basePrice) || 0,
      category: category || undefined,
    };

    try {
      if (isEdit && service) {
        await updateService(service.id, data);
      } else {
        await createService(data);
      }
      onOpenChange(false);
      resetForm();
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('doctor.editService') : t('doctor.addService')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('doctor.nameRequired')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label>{t('doctor.nameArabic')}</Label>
            <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
          </div>
          <div>
            <Label>{t('doctor.category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder={t('doctor.selectCategory')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">{t('doctor.catConsultation')}</SelectItem>
                <SelectItem value="procedure">{t('doctor.catProcedure')}</SelectItem>
                <SelectItem value="follow_up">{t('doctor.catFollowUp')}</SelectItem>
                <SelectItem value="emergency">{t('doctor.catEmergency')}</SelectItem>
                <SelectItem value="dental">{t('doctor.catDental')}</SelectItem>
                <SelectItem value="reproductive">{t('doctor.catReproductive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('doctor.basePrice')}</Label>
            <Input type="number" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
          </div>
          <div>
            <Label>{t('common.description')}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isCreating || isUpdating}>{isEdit ? t('common.save') : t('doctor.addService')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
