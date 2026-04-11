import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog, MasterDataType } from "../AddMasterDataDialog";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";

interface StepDetailsProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepDetails = ({ data, onChange }: StepDetailsProps) => {
  const { t, dir } = useI18n();
  const isRTL = dir === 'rtl';
  const { colors, breeds, branches, stables, housingUnits, createColor, createBreed } = useHorseMasterData();
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
    <div className="space-y-6">
      {/* Breed & Color Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'السلالة واللون' : 'Breed & Color'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.breed')}</Label>
            <div className="flex gap-2">
              <Select value={data.breed_id} onValueChange={(v) => onChange({ breed_id: v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={t('horses.wizard.selectBreed')} /></SelectTrigger>
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
            <Label>{t('horses.wizard.color')}</Label>
            <div className="flex gap-2">
              <Select value={data.color_id} onValueChange={(v) => onChange({ color_id: v })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={t('horses.wizard.selectColor')} /></SelectTrigger>
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
      </div>

      {/* Identification Numbers */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'أرقام التعريف' : 'Identification Numbers'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="microchip">{t('horses.wizard.microchip')}</Label>
            <Input id="microchip" value={data.microchip_number} onChange={(e) => onChange({ microchip_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passport">{t('horses.wizard.passport')}</Label>
            <Input id="passport" value={data.passport_number} onChange={(e) => onChange({ passport_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ueln">{t('horses.wizard.ueln')}</Label>
            <Input id="ueln" value={data.ueln} onChange={(e) => onChange({ ueln: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Location & Housing */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'الموقع والإسكان' : 'Location & Housing'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('horses.wizard.branch')}</Label>
            <Select value={data.branch_id} onValueChange={(v) => onChange({ branch_id: v })}>
              <SelectTrigger><SelectValue placeholder={t('horses.wizard.selectBranch')} /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('horses.wizard.stable')}</Label>
            <Select value={data.stable_id} onValueChange={(v) => onChange({ stable_id: v })}>
              <SelectTrigger><SelectValue placeholder={t('horses.wizard.selectStable')} /></SelectTrigger>
              <SelectContent>
                {stables.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('horses.wizard.housingUnit')}</Label>
          <Select value={data.housing_unit_id} onValueChange={(v) => onChange({ housing_unit_id: v })}>
            <SelectTrigger><SelectValue placeholder={t('horses.wizard.selectHousingUnit')} /></SelectTrigger>
            <SelectContent>
              {housingUnits.filter(u => u.status === 'available').map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.code} ({u.unit_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('horses.wizard.status')}</Label>
          <Select value={data.status} onValueChange={(v: "active" | "inactive") => onChange({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('horses.wizard.active')}</SelectItem>
              <SelectItem value="inactive">{t('horses.wizard.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('horses.wizard.housingNotes')}</Label>
          <Textarea 
            value={data.housing_notes} 
            onChange={(e) => onChange({ housing_notes: e.target.value })} 
            placeholder={t('horses.wizard.additionalNotesPlaceholder')} 
          />
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
