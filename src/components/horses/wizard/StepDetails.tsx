import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { isAdultHorse } from "@/lib/horseClassification";
import type { HorseWizardData } from "../HorseWizard";
import { useMemo } from "react";

interface StepDetailsProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepDetails = ({ data, onChange }: StepDetailsProps) => {
  const { branches, stables, housingUnits } = useHorseMasterData();

  // Check if horse is adult for broodmare toggle
  const isAdult = useMemo(() => {
    return isAdultHorse({
      gender: data.gender,
      birth_date: data.birth_date,
      birth_at: data.birth_at,
    });
  }, [data.gender, data.birth_date, data.birth_at]);

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

      {/* Gelding Toggle - Only for Male Horses */}
      {data.gender === "male" && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="gelded" className="text-sm font-medium">Is Gelded?</Label>
              <p className="text-xs text-muted-foreground">Mark if this horse has been castrated</p>
            </div>
            <Switch 
              id="gelded" 
              checked={data.is_gelded} 
              onCheckedChange={(checked) => onChange({ is_gelded: checked })} 
            />
          </div>
        </div>
      )}

      {/* Broodmare Toggle - Only for Adult Female Horses */}
      {data.gender === "female" && isAdult && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="broodmare" className="text-sm font-medium">Broodmare Role</Label>
              <p className="text-xs text-muted-foreground">Mark if this mare is used for breeding</p>
            </div>
            <Switch 
              id="broodmare" 
              checked={data.breeding_role === 'broodmare'} 
              onCheckedChange={(checked) => onChange({ breeding_role: checked ? 'broodmare' : '' })} 
            />
          </div>
        </div>
      )}

      {/* Pregnancy Section - Only for Broodmares */}
      {data.gender === "female" && data.breeding_role === 'broodmare' && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-4">
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
