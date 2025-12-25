import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HorseWizardData } from "../HorseWizard";

interface StepPedigreeProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepPedigree = ({ data, onChange }: StepPedigreeProps) => {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-xl">
        <h4 className="font-semibold text-navy mb-4">Mother (Dam)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mother Name (English)</Label>
            <Input value={data.mother_name} onChange={(e) => onChange({ mother_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Mother Name (Arabic)</Label>
            <Input value={data.mother_name_ar} onChange={(e) => onChange({ mother_name_ar: e.target.value })} dir="rtl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Maternal Grandmother</Label>
            <Input value={data.maternal_grandmother} onChange={(e) => onChange({ maternal_grandmother: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Maternal Grandfather</Label>
            <Input value={data.maternal_grandfather} onChange={(e) => onChange({ maternal_grandfather: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="p-4 border rounded-xl">
        <h4 className="font-semibold text-navy mb-4">Father (Sire)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Father Name (English)</Label>
            <Input value={data.father_name} onChange={(e) => onChange({ father_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Father Name (Arabic)</Label>
            <Input value={data.father_name_ar} onChange={(e) => onChange({ father_name_ar: e.target.value })} dir="rtl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Paternal Grandmother</Label>
            <Input value={data.paternal_grandmother} onChange={(e) => onChange({ paternal_grandmother: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Paternal Grandfather</Label>
            <Input value={data.paternal_grandfather} onChange={(e) => onChange({ paternal_grandfather: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
};
