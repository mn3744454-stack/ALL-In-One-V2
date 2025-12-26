import { useState, useEffect } from "react";
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

export interface HorseData {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  birth_date?: string | null;
  birth_at?: string | null;
  breed_id?: string | null;
  color_id?: string | null;
  age_category?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  branch_id?: string | null;
  stable_id?: string | null;
  housing_unit_id?: string | null;
  housing_notes?: string | null;
  status?: string | null;
  is_pregnant?: boolean;
  pregnancy_months?: number | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  height?: number | null;
  weight?: number | null;
  mane_marks?: string | null;
  body_marks?: string | null;
  legs_marks?: string | null;
  distinctive_marks_notes?: string | null;
  mother_id?: string | null;
  mother_name?: string | null;
  mother_name_ar?: string | null;
  father_id?: string | null;
  father_name?: string | null;
  father_name_ar?: string | null;
  maternal_grandmother?: string | null;
  maternal_grandfather?: string | null;
  paternal_grandmother?: string | null;
  paternal_grandfather?: string | null;
  breeder_id?: string | null;
  images?: string[] | null;
  videos?: string[] | null;
  external_links?: string[] | null;
}

interface HorseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  existingHorse?: HorseData | null;
}

const mapHorseToWizardData = (horse: HorseData): HorseWizardData => ({
  isRegistered: false,
  existingHorseId: horse.id,
  name: horse.name || "",
  name_ar: horse.name_ar || "",
  gender: horse.gender as "male" | "female",
  birth_date: horse.birth_date || "",
  birth_at: horse.birth_at || "",
  breed_id: horse.breed_id || "",
  color_id: horse.color_id || "",
  age_category: horse.age_category || "",
  microchip_number: horse.microchip_number || "",
  passport_number: horse.passport_number || "",
  ueln: horse.ueln || "",
  branch_id: horse.branch_id || "",
  stable_id: horse.stable_id || "",
  housing_unit_id: horse.housing_unit_id || "",
  housing_notes: horse.housing_notes || "",
  status: (horse.status as "active" | "inactive") || "active",
  is_pregnant: horse.is_pregnant || false,
  pregnancy_months: horse.pregnancy_months || 0,
  is_gelded: horse.is_gelded || false,
  breeding_role: (horse.breeding_role as "broodmare" | "") || "",
  height: horse.height?.toString() || "",
  weight: horse.weight?.toString() || "",
  mane_marks: horse.mane_marks || "",
  body_marks: horse.body_marks || "",
  legs_marks: horse.legs_marks || "",
  distinctive_marks_notes: horse.distinctive_marks_notes || "",
  mother_id: horse.mother_id || "",
  mother_name: horse.mother_name || "",
  mother_name_ar: horse.mother_name_ar || "",
  father_id: horse.father_id || "",
  father_name: horse.father_name || "",
  father_name_ar: horse.father_name_ar || "",
  maternal_grandmother: horse.maternal_grandmother || "",
  maternal_grandfather: horse.maternal_grandfather || "",
  paternal_grandmother: horse.paternal_grandmother || "",
  paternal_grandfather: horse.paternal_grandfather || "",
  breeder_id: horse.breeder_id || "",
  owners: [],
  images: horse.images || [],
  videos: horse.videos || [],
  external_links: horse.external_links || [],
});

export const HorseWizard = ({ open, onOpenChange, onSuccess, mode = "create", existingHorse }: HorseWizardProps) => {
  const isMobile = useIsMobile();
  const { activeTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState(mode === "edit" ? 1 : 0); // Skip registration for edit
  const [data, setData] = useState<HorseWizardData>(initialData);
  const [saving, setSaving] = useState(false);

  // Pre-fill data when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingHorse && open) {
      setData(mapHorseToWizardData(existingHorse));
      setCurrentStep(1); // Skip registration step
    } else if (mode === "create" && open) {
      setData(initialData);
      setCurrentStep(0);
    }
  }, [mode, existingHorse, open]);

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
      const horsePayload = {
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
      };

      let horseId: string;

      if (mode === "edit" && existingHorse?.id) {
        // Update existing horse
        const { error: horseError } = await supabase
          .from("horses")
          .update(horsePayload)
          .eq("id", existingHorse.id);

        if (horseError) throw horseError;
        horseId = existingHorse.id;

        toast({
          title: "Horse updated successfully",
          description: `${data.name} has been updated.`,
        });
      } else {
        // Insert new horse
        const { data: horse, error: horseError } = await supabase
          .from("horses")
          .insert(horsePayload)
          .select()
          .single();

        if (horseError) throw horseError;
        horseId = horse.id;

        // Insert ownership records if any (only for new horses)
        if (data.owners.length > 0) {
          const ownershipRecords = data.owners.map((o) => ({
            horse_id: horseId,
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
      }

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
            {mode === "edit" ? "Save Changes" : "Save Horse"}
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

  const wizardTitle = mode === "edit" ? "Edit Horse" : "Add New Horse";
  const saveButtonText = mode === "edit" ? "Save Changes" : "Save Horse";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle>{wizardTitle}</SheetTitle>
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
          <DialogTitle>{wizardTitle}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
