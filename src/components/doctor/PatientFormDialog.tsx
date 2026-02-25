import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients, type DoctorPatient } from "@/hooks/doctor/usePatients";
import { useI18n } from "@/i18n";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: DoctorPatient | null;
}

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  const { createPatient, updatePatient, isCreating, isUpdating } = usePatients();
  const { t } = useI18n();
  const isEdit = !!patient;

  const [name, setName] = useState(patient?.name || "");
  const [nameAr, setNameAr] = useState(patient?.name_ar || "");
  const [gender, setGender] = useState(patient?.gender || "");
  const [approxAge, setApproxAge] = useState(patient?.approx_age || "");
  const [breedText, setBreedText] = useState(patient?.breed_text || "");
  const [colorText, setColorText] = useState(patient?.color_text || "");
  const [microchipNumber, setMicrochipNumber] = useState(patient?.microchip_number || "");
  const [passportNumber, setPassportNumber] = useState(patient?.passport_number || "");
  const [ownerName, setOwnerName] = useState(patient?.owner_name || "");
  const [ownerPhone, setOwnerPhone] = useState(patient?.owner_phone || "");
  const [stableName, setStableName] = useState(patient?.stable_name || "");
  const [notes, setNotes] = useState(patient?.notes || "");

  const resetForm = () => {
    setName(patient?.name || "");
    setNameAr(patient?.name_ar || "");
    setGender(patient?.gender || "");
    setApproxAge(patient?.approx_age || "");
    setBreedText(patient?.breed_text || "");
    setColorText(patient?.color_text || "");
    setMicrochipNumber(patient?.microchip_number || "");
    setPassportNumber(patient?.passport_number || "");
    setOwnerName(patient?.owner_name || "");
    setOwnerPhone(patient?.owner_phone || "");
    setStableName(patient?.stable_name || "");
    setNotes(patient?.notes || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
      gender: gender || undefined,
      approx_age: approxAge || undefined,
      breed_text: breedText || undefined,
      color_text: colorText || undefined,
      microchip_number: microchipNumber || undefined,
      passport_number: passportNumber || undefined,
      owner_name: ownerName || undefined,
      owner_phone: ownerPhone || undefined,
      stable_name: stableName || undefined,
      notes: notes || undefined,
    };

    try {
      if (isEdit && patient) {
        await updatePatient(patient.id, data);
      } else {
        await createPatient(data);
      }
      onOpenChange(false);
      resetForm();
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('doctor.editPatient') : t('doctor.addPatient')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>{t('doctor.nameRequired')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>{t('doctor.nameArabic')}</Label>
              <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <Label>{t('doctor.gender')}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stallion">{t('doctor.stallion')}</SelectItem>
                  <SelectItem value="mare">{t('doctor.mare')}</SelectItem>
                  <SelectItem value="gelding">{t('doctor.gelding')}</SelectItem>
                  <SelectItem value="colt">{t('doctor.colt')}</SelectItem>
                  <SelectItem value="filly">{t('doctor.filly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('doctor.approxAge')}</Label>
              <Input value={approxAge} onChange={e => setApproxAge(e.target.value)} placeholder={t('doctor.approxAgePlaceholder')} />
            </div>
            <div>
              <Label>{t('doctor.breed')}</Label>
              <Input value={breedText} onChange={e => setBreedText(e.target.value)} />
            </div>
            <div>
              <Label>{t('doctor.color')}</Label>
              <Input value={colorText} onChange={e => setColorText(e.target.value)} />
            </div>
            <div>
              <Label>{t('doctor.microchip')}</Label>
              <Input value={microchipNumber} onChange={e => setMicrochipNumber(e.target.value)} />
            </div>
            <div>
              <Label>{t('doctor.passport')}</Label>
              <Input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <Label>{t('doctor.ownerName')}</Label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} />
            </div>
            <div>
              <Label>{t('doctor.ownerPhone')}</Label>
              <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>{t('doctor.stableName')}</Label>
              <Input value={stableName} onChange={e => setStableName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>{t('common.notes')}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isCreating || isUpdating}>{isEdit ? t('common.save') : t('doctor.addPatient')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
