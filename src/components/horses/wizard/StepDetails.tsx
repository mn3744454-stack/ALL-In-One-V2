import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import type { HorseWizardData } from "../HorseWizard";

interface StepDetailsProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepDetails = ({ data, onChange }: StepDetailsProps) => {
  const { branches, stables, housingUnits } = useHorseMasterData();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select value={data.branch_id} onValueChange={(v) => onChange({ branch_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Stable</Label>
          <Select value={data.stable_id} onValueChange={(v) => onChange({ stable_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select stable" /></SelectTrigger>
            <SelectContent>
              {stables.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Housing Unit</Label>
        <Select value={data.housing_unit_id} onValueChange={(v) => onChange({ housing_unit_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select housing unit" /></SelectTrigger>
          <SelectContent>
            {housingUnits.filter(u => u.status === 'available').map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.code} ({u.unit_type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={data.status} onValueChange={(v: "active" | "inactive") => onChange({ status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.gender === "female" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-between">
            <Label htmlFor="pregnant">Is Pregnant?</Label>
            <Switch id="pregnant" checked={data.is_pregnant} onCheckedChange={(c) => onChange({ is_pregnant: c })} />
          </div>
          {data.is_pregnant && (
            <div className="space-y-2">
              <Label>Pregnancy Months</Label>
              <Input type="number" min={1} max={12} value={data.pregnancy_months || ""} onChange={(e) => onChange({ pregnancy_months: parseInt(e.target.value) || 0 })} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Housing Notes</Label>
        <Textarea value={data.housing_notes} onChange={(e) => onChange({ housing_notes: e.target.value })} placeholder="Additional notes..." />
      </div>
    </div>
  );
};
