import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { useHorseMasterData, HorseOwner } from "@/hooks/useHorseMasterData";
import { OwnerPickerSheet } from "./OwnerPickerSheet";
import { BilingualName } from "@/components/ui/BilingualName";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";

interface StepOwnershipProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepOwnership = ({ data, onChange }: StepOwnershipProps) => {
  const { t } = useI18n();
  const { owners } = useHorseMasterData();
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);

  const totalPercentage = data.owners.reduce((sum, o) => sum + o.percentage, 0);
  const primaryCount = data.owners.filter((o) => o.is_primary).length;
  const isValid = data.owners.length === 0 || (totalPercentage === 100 && primaryCount === 1);

  // Redistribute percentages equally among all owners
  const redistributePercentages = (ownersList: typeof data.owners): typeof data.owners => {
    if (ownersList.length === 0) return ownersList;

    const equalShare = Math.floor(100 / ownersList.length);
    const remainder = 100 % ownersList.length;

    return ownersList.map((owner, index) => ({
      ...owner,
      percentage: equalShare + (index === 0 ? remainder : 0),
    }));
  };

  // Add another owner row (no owner selected yet)
  const addOwnerRow = () => {
    const newOwner = {
      owner_id: "",
      percentage: 0,
      is_primary: data.owners.length === 0,
    };
    const newOwners = redistributePercentages([...data.owners, newOwner]);
    onChange({ owners: newOwners });
  };

  const updateOwner = (index: number, updates: Partial<typeof data.owners[0]>) => {
    const newOwners = [...data.owners];
    newOwners[index] = { ...newOwners[index], ...updates };
    if (updates.is_primary) {
      newOwners.forEach((o, i) => { if (i !== index) o.is_primary = false; });
    }
    onChange({ owners: newOwners });
  };

  const removeOwner = (index: number) => {
    const remaining = data.owners.filter((_, i) => i !== index);
    const redistributed = redistributePercentages(remaining);
    if (data.owners[index]?.is_primary && redistributed.length > 0) {
      redistributed[0].is_primary = true;
    }
    onChange({ owners: redistributed });
  };

  const getPrimaryText = () => {
    if (primaryCount === 1) return t('horses.wizard.onePrimary');
    if (primaryCount === 0) return t('horses.wizard.noPrimaryOwner');
    return t('horses.wizard.multiplePrimary').replace('{{count}}', String(primaryCount));
  };

  const getNonPrimaryLabel = (index: number): string => {
    let nonPrimaryCount = 0;
    for (let i = 0; i < index; i++) {
      if (!data.owners[i].is_primary) nonPrimaryCount++;
    }
    return t('horses.wizard.ownerNumber').replace('{{number}}', String(nonPrimaryCount + 2));
  };

  const getOwnerById = (id: string): HorseOwner | undefined =>
    owners.find((o) => o.id === id);

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-navy">{t('horses.wizard.owners')}</h4>
          <p className="text-sm text-muted-foreground">{t('horses.wizard.ownershipDescription')}</p>
        </div>
      </div>


      {/* Validation Status */}
      {data.owners.length > 0 && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${isValid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">
            {totalPercentage}% {t('common.total') || 'total'} • {getPrimaryText()}
          </span>
        </div>
      )}

      {data.owners.map((owner, index) => {
        const selected = getOwnerById(owner.owner_id);
        return (
          <div key={index} className="p-4 border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={owner.is_primary ? "default" : "secondary"}>
                {owner.is_primary ? t('horses.wizard.primaryOwner') : getNonPrimaryLabel(index)}
              </Badge>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOwner(index)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('horses.wizard.selectOwner')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-auto min-h-10 py-2 font-normal"
                  onClick={() => setPickerOpenIndex(index)}
                >
                  {selected ? (
                    <BilingualName
                      name={selected.name}
                      nameAr={selected.name_ar}
                      primaryClassName="text-sm"
                    />
                  ) : (
                    <span className="text-muted-foreground">{t('horses.wizard.chooseOwner')}</span>
                  )}
                  <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ms-2" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{t('horses.wizard.percentage')}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={owner.percentage}
                    onChange={(e) => updateOwner(index, { percentage: parseInt(e.target.value) || 0 })}
                    className="pe-8"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={owner.is_primary} onCheckedChange={(c) => updateOwner(index, { is_primary: c })} />
              <Label>{t('horses.wizard.primaryOwner')}</Label>
            </div>
          </div>
        );
      })}

      {data.owners.length === 0 && (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <p>{t('horses.wizard.noOwnersYet')}</p>
          <Button type="button" variant="outline" onClick={addOwnerRow} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('horses.wizard.addOwner')}
          </Button>
        </div>
      )}

      <OwnerPickerSheet
        open={pickerOpenIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPickerOpenIndex(null);
        }}
        selectedOwnerId={pickerOpenIndex !== null ? data.owners[pickerOpenIndex]?.owner_id : null}
        onOwnerSelect={(ownerId) => {
          if (pickerOpenIndex !== null) {
            updateOwner(pickerOpenIndex, { owner_id: ownerId });
          }
        }}
      />
    </div>
  );
};
