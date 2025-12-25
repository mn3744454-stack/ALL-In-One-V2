import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HorseWizardData } from "../HorseWizard";

interface StepPhysicalProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepPhysical = ({ data, onChange }: StepPhysicalProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Height (cm)</Label>
          <Input type="number" value={data.height} onChange={(e) => onChange({ height: e.target.value })} placeholder="e.g., 160" />
        </div>
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input type="number" value={data.weight} onChange={(e) => onChange({ weight: e.target.value })} placeholder="e.g., 500" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mane Marks</Label>
        <Textarea value={data.mane_marks} onChange={(e) => onChange({ mane_marks: e.target.value })} placeholder="Describe mane characteristics..." />
      </div>

      <div className="space-y-2">
        <Label>Body Marks</Label>
        <Textarea value={data.body_marks} onChange={(e) => onChange({ body_marks: e.target.value })} placeholder="Describe body markings..." />
      </div>

      <div className="space-y-2">
        <Label>Legs Marks</Label>
        <Textarea value={data.legs_marks} onChange={(e) => onChange({ legs_marks: e.target.value })} placeholder="Describe leg markings..." />
      </div>

      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea value={data.distinctive_marks_notes} onChange={(e) => onChange({ distinctive_marks_notes: e.target.value })} placeholder="Any other distinctive marks..." />
      </div>
    </div>
  );
};
