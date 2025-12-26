import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Step components
import { StepRegistration } from "./wizard/StepRegistration";
import { StepBasicInfo } from "./wizard/StepBasicInfo";
import { StepDetails } from "./wizard/StepDetails";
import { StepPhysical } from "./wizard/StepPhysical";
import { StepPedigree } from "./wizard/StepPedigree";
import { StepOwnership } from "./wizard/StepOwnership";
import { StepMedia } from "./wizard/StepMedia";

const STEPS = [
  { id: "registration", title: "Registration Check" },
  { id: "basic", title: "Basic Info" },
  { id: "details", title: "Location & Details" },
  { id: "physical", title: "Physical Specs" },
  { id: "pedigree", title: "Pedigree" },
  { id: "ownership", title: "Ownership" },
  { id: "media", title: "Media" },
];

export interface HorseWizardData {
  // Registration check
  isRegistered: boolean;
  existingHorseId?: string;
  
  // Basic info
  name: string;
  name_ar: string;
  gender: "male" | "female";
  birth_date: string;
  birth_at: string; // ISO timestamp with timezone (combines date + time)
  breed_id: string;
  color_id: string;
  age_category: string;
  microchip_number: string;
  passport_number: string;
  ueln: string;
  
  // Details
  branch_id: string;
  stable_id: string;
  housing_unit_id: string;
  housing_notes: string;
  status: "active" | "inactive";
  is_pregnant: boolean;
  pregnancy_months: number;
  is_gelded: boolean;
  breeding_role: 'broodmare' | '';
  
  // Physical
  height: string;
  weight: string;
  mane_marks: string;
  body_marks: string;
  legs_marks: string;
  distinctive_marks_notes: string;
  
  // Pedigree
  mother_id: string;
  mother_name: string;
  mother_name_ar: string;
  father_id: string;
  father_name: string;
  father_name_ar: string;
  maternal_grandmother: string;
  maternal_grandfather: string;
  paternal_grandmother: string;
  paternal_grandfather: string;
  breeder_id: string;
  
  // Ownership
  owners: Array<{
    owner_id: string;
    percentage: number;
    is_primary: boolean;
  }>;
  
  // Media
  images: string[];
  videos: string[];
  external_links: string[];
}

const initialData: HorseWizardData = {
  isRegistered: false,
  name: "",
  name_ar: "",
  gender: "male",
  birth_date: "",
  birth_at: "",
  breed_id: "",
  color_id: "",
  age_category: "",
  microchip_number: "",
  passport_number: "",
  ueln: "",
  branch_id: "",
  stable_id: "",
  housing_unit_id: "",
  housing_notes: "",
  status: "active",
  is_pregnant: false,
  pregnancy_months: 0,
  is_gelded: false,
  breeding_role: "",
  height: "",
  weight: "",
  mane_marks: "",
  body_marks: "",
  legs_marks: "",
  distinctive_marks_notes: "",
  mother_id: "",
  mother_name: "",
  mother_name_ar: "",
  father_id: "",
  father_name: "",
  father_name_ar: "",
  maternal_grandmother: "",
  maternal_grandfather: "",
  paternal_grandmother: "",
  paternal_grandfather: "",
  breeder_id: "",
  owners: [],
  images: [],
  videos: [],
  external_links: [],
};

interface HorseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const HorseWizard = ({ open, onOpenChange, onSuccess }: HorseWizardProps) => {
  const isMobile = useIsMobile();
  const { activeTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<HorseWizardData>(initialData);
  const [saving, setSaving] = useState(false);

  const updateData = (updates: Partial<HorseWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canGoNext = () => {
    const step = STEPS[currentStep];
    switch (step.id) {
      case "registration":
        return true;
      case "basic":
        return data.name.trim() !== "" && data.gender;
      case "details":
        return true;
      case "physical":
        return true;
      case "pedigree":
        return true;
      case "ownership":
        // Check ownership rules only if owners are defined
        if (data.owners.length > 0) {
          const totalPercentage = data.owners.reduce((sum, o) => sum + o.percentage, 0);
          const primaryCount = data.owners.filter((o) => o.is_primary).length;
          return totalPercentage === 100 && primaryCount === 1;
        }
        return true;
      case "media":
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!activeTenant) {
      toast({
        title: "Error",
        description: "No active tenant selected",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Insert the horse
      const { data: horse, error: horseError } = await supabase
        .from("horses")
        .insert({
          tenant_id: activeTenant.tenant_id,
          name: data.name,
          name_ar: data.name_ar || null,
          gender: data.gender,
          birth_date: data.birth_date || null,
          birth_at: data.birth_at || null,
          breed_id: data.breed_id || null,
          color_id: data.color_id || null,
          age_category: data.age_category || null,
          microchip_number: data.microchip_number || null,
          passport_number: data.passport_number || null,
          ueln: data.ueln || null,
          branch_id: data.branch_id || null,
          stable_id: data.stable_id || null,
          housing_unit_id: data.housing_unit_id || null,
          housing_notes: data.housing_notes || null,
          status: data.status,
          is_pregnant: data.is_pregnant,
          pregnancy_months: data.is_pregnant ? data.pregnancy_months : null,
          is_gelded: data.is_gelded,
          breeding_role: data.breeding_role || null,
          height: data.height ? parseFloat(data.height) : null,
          weight: data.weight ? parseFloat(data.weight) : null,
          mane_marks: data.mane_marks || null,
          body_marks: data.body_marks || null,
          legs_marks: data.legs_marks || null,
          distinctive_marks_notes: data.distinctive_marks_notes || null,
          mother_id: data.mother_id || null,
          mother_name: data.mother_name || null,
          mother_name_ar: data.mother_name_ar || null,
          father_id: data.father_id || null,
          father_name: data.father_name || null,
          father_name_ar: data.father_name_ar || null,
          maternal_grandmother: data.maternal_grandmother || null,
          maternal_grandfather: data.maternal_grandfather || null,
          paternal_grandmother: data.paternal_grandmother || null,
          paternal_grandfather: data.paternal_grandfather || null,
          breeder_id: data.breeder_id || null,
          images: data.images,
          videos: data.videos,
          external_links: data.external_links,
        })
        .select()
        .single();

      if (horseError) throw horseError;

      // Insert ownership records if any
      if (data.owners.length > 0 && horse) {
        const ownershipRecords = data.owners.map((o) => ({
          horse_id: horse.id,
          owner_id: o.owner_id,
          ownership_percentage: o.percentage,
          is_primary: o.is_primary,
        }));

        const { error: ownershipError } = await supabase
          .from("horse_ownership" as any)
          .insert(ownershipRecords);

        if (ownershipError) throw ownershipError;
      }

      toast({
        title: "Horse added successfully",
        description: `${data.name} has been added to your stable.`,
      });

      // Reset and close
      setData(initialData);
      setCurrentStep(0);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving horse:", error);
      toast({
        title: "Error saving horse",
        description: error.message || "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setData(initialData);
    setCurrentStep(0);
    onOpenChange(false);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case "registration":
        return <StepRegistration data={data} onChange={updateData} />;
      case "basic":
        return <StepBasicInfo data={data} onChange={updateData} />;
      case "details":
        return <StepDetails data={data} onChange={updateData} />;
      case "physical":
        return <StepPhysical data={data} onChange={updateData} />;
      case "pedigree":
        return <StepPedigree data={data} onChange={updateData} />;
      case "ownership":
        return <StepOwnership data={data} onChange={updateData} />;
      case "media":
        return <StepMedia data={data} onChange={updateData} />;
      default:
        return null;
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-medium text-navy">
            {STEPS[currentStep].title}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators (desktop only) */}
      <div className="hidden md:flex items-center justify-center gap-2 mb-6">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => index <= currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
              index === currentStep
                ? "bg-gold text-navy"
                : index < currentStep
                ? "bg-gold/20 text-gold cursor-pointer hover:bg-gold/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 pb-4 border-t mt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentStep === 0 || saving}
          className="min-w-[100px]"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button onClick={handleSave} disabled={!canGoNext() || saving} className="min-w-[120px]">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Horse
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canGoNext() || saving} className="min-w-[100px]">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle>Add New Horse</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl lg:max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Horse</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
