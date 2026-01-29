import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog } from "../AddMasterDataDialog";
import type { HorseWizardData } from "../HorseWizard";
import { useI18n } from "@/i18n";

interface StepOwnershipProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepOwnership = ({ data, onChange }: StepOwnershipProps) => {
  const { t } = useI18n();
  const { owners, createOwner } = useHorseMasterData();
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newlyCreatedOwnerId, setNewlyCreatedOwnerId] = useState<string | null>(null);

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
      // Give the remainder to the first owner to ensure total = 100
      percentage: equalShare + (index === 0 ? remainder : 0),
    }));
  };

  // Add another owner row (inline "+" button)
  const addOwnerRow = () => {
    const newOwner = { 
      owner_id: newlyCreatedOwnerId || "", 
      percentage: 0, 
      is_primary: data.owners.length === 0 
    };
    const newOwners = redistributePercentages([...data.owners, newOwner]);
    onChange({ owners: newOwners });
    setNewlyCreatedOwnerId(null); // Reset after using
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
    // Redistribute percentages after removal
    const redistributed = redistributePercentages(remaining);
    // If we removed the primary owner, make the first one primary
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

  // Calculate non-primary owner index (for labeling as Owner 2, Owner 3, etc.)
  const getNonPrimaryLabel = (index: number): string => {
    // Count how many non-primary owners appear before this index
    let nonPrimaryCount = 0;
    for (let i = 0; i < index; i++) {
      if (!data.owners[i].is_primary) {
        nonPrimaryCount++;
      }
    }
    // Labels start at 2 since "Primary Owner" replaces Owner 1
    return t('horses.wizard.ownerNumber').replace('{{number}}', String(nonPrimaryCount + 2));
  };

  // Handle successful owner creation from dialog
  const handleOwnerCreated = (newData: unknown) => {
    if (newData && typeof newData === 'object' && 'id' in newData) {
      setNewlyCreatedOwnerId((newData as { id: string }).id);
      // Auto-add a row with the new owner if we have no owners yet, or let user click inline +
      if (data.owners.length === 0) {
        const newOwner = { 
          owner_id: (newData as { id: string }).id, 
          percentage: 100, 
          is_primary: true 
        };
        onChange({ owners: [newOwner] });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-navy">{t('horses.wizard.owners')}</h4>
          <p className="text-sm text-muted-foreground">{t('horses.wizard.ownershipDescription')}</p>
        </div>
        {/* Top button: Opens "Create new owner" modal */}
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddOwner(true)} 
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" /> 
          {t('horses.wizard.createNewOwner')}
        </Button>
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

      {data.owners.map((owner, index) => (
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
              <div className="flex gap-2">
                <Select value={owner.owner_id} onValueChange={(v) => updateOwner(index, { owner_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('horses.wizard.selectOwner')} /></SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {/* Inline "+" button: Adds another owner row */}
                <Button type="button" size="icon" variant="outline" onClick={addOwnerRow} title={t('horses.wizard.addOwner')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('horses.wizard.percentage')}</Label>
              <Input type="number" min={1} max={100} value={owner.percentage} onChange={(e) => updateOwner(index, { percentage: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={owner.is_primary} onCheckedChange={(c) => updateOwner(index, { is_primary: c })} />
            <Label>{t('horses.wizard.primaryOwner')}</Label>
          </div>
        </div>
      ))}

      {data.owners.length === 0 && (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <p>{t('horses.wizard.noOwnersYet')}</p>
          <Button type="button" variant="outline" onClick={addOwnerRow} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('horses.wizard.addOwner')}
          </Button>
        </div>
      )}

      <AddMasterDataDialog
        open={showAddOwner}
        onOpenChange={setShowAddOwner}
        type="owner"
        onCreate={(formData) => createOwner(formData.name, formData.name_ar, formData.phone, formData.email)}
        onSuccess={handleOwnerCreated}
      />
    </div>
  );
};
