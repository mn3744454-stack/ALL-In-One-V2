import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog, MasterDataType } from "../AddMasterDataDialog";
import type { HorseWizardData } from "../HorseWizard";

interface StepBasicInfoProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepBasicInfo = ({ data, onChange }: StepBasicInfoProps) => {
  const { colors, breeds, createColor, createBreed } = useHorseMasterData();
  const [dialogType, setDialogType] = useState<MasterDataType | null>(null);

  const handleCreate = async (formData: Record<string, string>) => {
    if (dialogType === "color") {
      return createColor(formData.name, formData.name_ar);
    } else if (dialogType === "breed") {
      return createBreed(formData.name, formData.name_ar);
    }
    return { data: null, error: new Error("Unknown type") };
  };

  const handleSuccess = (result: any) => {
    if (dialogType === "color" && result?.id) {
      onChange({ color_id: result.id });
    } else if (dialogType === "breed" && result?.id) {
      onChange({ breed_id: result.id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Horse Name (English) *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter horse name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_ar">Horse Name (Arabic)</Label>
          <Input
            id="name_ar"
            value={data.name_ar}
            onChange={(e) => onChange({ name_ar: e.target.value })}
            placeholder="أدخل اسم الحصان"
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={data.gender} onValueChange={(v: "male" | "female") => onChange({ gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male (Stallion/Colt)</SelectItem>
              <SelectItem value="female">Female (Mare/Filly)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Age Category</Label>
          <Select value={data.age_category} onValueChange={(v) => onChange({ age_category: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stallion">Stallion</SelectItem>
              <SelectItem value="mare">Mare</SelectItem>
              <SelectItem value="colt">Colt</SelectItem>
              <SelectItem value="filly">Filly</SelectItem>
              <SelectItem value="gelding">Gelding</SelectItem>
              <SelectItem value="foal">Foal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Breed</Label>
          <div className="flex gap-2">
            <Select value={data.breed_id} onValueChange={(v) => onChange({ breed_id: v })}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select breed" /></SelectTrigger>
              <SelectContent>
                {breeds.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="outline" onClick={() => setDialogType("breed")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            <Select value={data.color_id} onValueChange={(v) => onChange({ color_id: v })}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select color" /></SelectTrigger>
              <SelectContent>
                {colors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="icon" variant="outline" onClick={() => setDialogType("color")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth_date">Birth Date</Label>
        <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => onChange({ birth_date: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="microchip">Microchip Number</Label>
          <Input id="microchip" value={data.microchip_number} onChange={(e) => onChange({ microchip_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passport">Passport Number</Label>
          <Input id="passport" value={data.passport_number} onChange={(e) => onChange({ passport_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ueln">UELN</Label>
          <Input id="ueln" value={data.ueln} onChange={(e) => onChange({ ueln: e.target.value })} />
        </div>
      </div>

      {dialogType && (
        <AddMasterDataDialog
          open={!!dialogType}
          onOpenChange={() => setDialogType(null)}
          type={dialogType}
          onCreate={handleCreate}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
