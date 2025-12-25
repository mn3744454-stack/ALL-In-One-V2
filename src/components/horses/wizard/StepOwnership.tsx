import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { AddMasterDataDialog } from "../AddMasterDataDialog";
import type { HorseWizardData } from "../HorseWizard";

interface StepOwnershipProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepOwnership = ({ data, onChange }: StepOwnershipProps) => {
  const { owners, createOwner } = useHorseMasterData();
  const [showAddOwner, setShowAddOwner] = useState(false);

  const totalPercentage = data.owners.reduce((sum, o) => sum + o.percentage, 0);
  const primaryCount = data.owners.filter((o) => o.is_primary).length;
  const isValid = data.owners.length === 0 || (totalPercentage === 100 && primaryCount === 1);

  const addOwner = () => {
    const remaining = 100 - totalPercentage;
    onChange({
      owners: [...data.owners, { owner_id: "", percentage: remaining > 0 ? remaining : 0, is_primary: data.owners.length === 0 }]
    });
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
    onChange({ owners: data.owners.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-navy">Ownership</h4>
          <p className="text-sm text-muted-foreground">Add owners with percentage shares</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOwner} className="gap-2">
          <Plus className="w-4 h-4" /> Add Owner
        </Button>
      </div>

      {/* Validation Status */}
      {data.owners.length > 0 && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${isValid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">
            {totalPercentage}% total {primaryCount === 1 ? '• 1 primary owner' : primaryCount === 0 ? '• No primary owner' : `• ${primaryCount} primary owners`}
          </span>
        </div>
      )}

      {data.owners.map((owner, index) => (
        <div key={index} className="p-4 border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={owner.is_primary ? "default" : "secondary"}>
              {owner.is_primary ? "Primary Owner" : `Owner ${index + 1}`}
            </Badge>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeOwner(index)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Owner</Label>
              <div className="flex gap-2">
                <Select value={owner.owner_id} onValueChange={(v) => updateOwner(index, { owner_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => setShowAddOwner(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Percentage (%)</Label>
              <Input type="number" min={1} max={100} value={owner.percentage} onChange={(e) => updateOwner(index, { percentage: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={owner.is_primary} onCheckedChange={(c) => updateOwner(index, { is_primary: c })} />
            <Label>Primary Owner</Label>
          </div>
        </div>
      ))}

      {data.owners.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No owners added yet. You can skip this step or add owners.</p>
        </div>
      )}

      <AddMasterDataDialog
        open={showAddOwner}
        onOpenChange={setShowAddOwner}
        type="owner"
        onCreate={(formData) => createOwner(formData.name, formData.name_ar, formData.phone, formData.email)}
      />
    </div>
  );
};
