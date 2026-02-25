import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients, type DoctorPatient } from "@/hooks/doctor/usePatients";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: DoctorPatient | null;
}

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  const { createPatient, updatePatient, isCreating, isUpdating } = usePatients();
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

  // Reset form when patient changes
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
          <DialogTitle>{isEdit ? "Edit Patient" : "Add Patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Name (Arabic)</Label>
              <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stallion">Stallion</SelectItem>
                  <SelectItem value="mare">Mare</SelectItem>
                  <SelectItem value="gelding">Gelding</SelectItem>
                  <SelectItem value="colt">Colt</SelectItem>
                  <SelectItem value="filly">Filly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approx. Age</Label>
              <Input value={approxAge} onChange={e => setApproxAge(e.target.value)} placeholder="e.g. 5 years" />
            </div>
            <div>
              <Label>Breed</Label>
              <Input value={breedText} onChange={e => setBreedText(e.target.value)} />
            </div>
            <div>
              <Label>Color</Label>
              <Input value={colorText} onChange={e => setColorText(e.target.value)} />
            </div>
            <div>
              <Label>Microchip #</Label>
              <Input value={microchipNumber} onChange={e => setMicrochipNumber(e.target.value)} />
            </div>
            <div>
              <Label>Passport #</Label>
              <Input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} />
            </div>
            <div>
              <Label>Owner Phone</Label>
              <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Stable Name</Label>
              <Input value={stableName} onChange={e => setStableName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || isUpdating}>{isEdit ? "Save" : "Add Patient"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
