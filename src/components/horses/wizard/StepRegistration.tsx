import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search } from "lucide-react";
import type { HorseWizardData } from "../HorseWizard";

interface StepRegistrationProps {
  data: HorseWizardData;
  onChange: (updates: Partial<HorseWizardData>) => void;
}

export const StepRegistration = ({ data, onChange }: StepRegistrationProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-navy mb-2">Is this horse already registered?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Check if the horse is already in the platform by microchip or passport number.
        </p>
      </div>

      <RadioGroup
        value={data.isRegistered ? "yes" : "no"}
        onValueChange={(v) => onChange({ isRegistered: v === "yes" })}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="no" id="no" />
          <Label htmlFor="no" className="cursor-pointer flex-1">
            <div className="font-medium">No, this is a new horse</div>
            <div className="text-sm text-muted-foreground">Register a new horse from scratch</div>
          </Label>
        </div>
        <div className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="yes" id="yes" />
          <Label htmlFor="yes" className="cursor-pointer flex-1">
            <div className="font-medium">Yes, search existing horse</div>
            <div className="text-sm text-muted-foreground">Find by name, microchip, passport, or UELN</div>
          </Label>
        </div>
      </RadioGroup>

      {data.isRegistered && (
        <div className="space-y-4 pt-4 border-t">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name (EN/AR), microchip, passport, or UELN..."
              className="pl-10"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Search functionality coming soon. Continue to add manually.
          </p>
        </div>
      )}
    </div>
  );
};
