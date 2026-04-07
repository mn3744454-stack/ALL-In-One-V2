import { useState, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, ChevronRight, ChevronLeft, MapPin } from "lucide-react";
import { useI18n } from "@/i18n";
import { useLocations } from "@/hooks/movement/useLocations";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { FacilityCreationForm, FACILITY_CATEGORY, type FacilityFormData } from "./FacilityCreationForm";

interface CreateBranchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBranchWizard({ open, onOpenChange }: CreateBranchWizardProps) {
  const { t, dir } = useI18n();
  const { createLocation, isCreating } = useLocations();
  const { createArea } = useFacilityAreas();
  const { createUnit } = useHousingUnits();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null);

  // Step 1 fields
  const [branchName, setBranchName] = useState("");
  const [branchNameAr, setBranchNameAr] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — facility form data via ref
  const [isFacilityValid, setIsFacilityValid] = useState(false);
  const facilityDataRef = useRef<FacilityFormData | null>(null);

  const handleFacilityDataChange = useCallback((data: FacilityFormData) => {
    facilityDataRef.current = data;
  }, []);

  const handleFacilityValidityChange = useCallback((valid: boolean) => {
    setIsFacilityValid(valid);
  }, []);

  const resetForm = () => {
    setStep(1);
    setBranchName("");
    setBranchNameAr("");
    setCity("");
    setAddress("");
    setCreatedBranchId(null);
    facilityDataRef.current = null;
    setIsFacilityValid(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const canProceedStep1 = branchName.trim().length > 0;

  // Advance to step 2: create branch first
  const handleProceedToStep2 = async () => {
    if (!canProceedStep1) return;
    setIsSubmitting(true);
    try {
      const newBranch = await createLocation({
        name: branchName.trim(),
        name_ar: branchNameAr.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });
      setCreatedBranchId(newBranch.id);
      queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expanded-branch-detail'] });
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit facility from step 2
  const handleCreateFacility = async () => {
    const data = facilityDataRef.current;
    if (!data || !data.name || !createdBranchId) return;
    setIsSubmitting(true);

    try {
      const category = FACILITY_CATEGORY[data.facilityType];
      const isHousing = category === 'housing';
      const isOpenArea = category === 'open_area';
      const isActivity = category === 'activity';

      let metadata: Record<string, unknown> | undefined;
      if (isActivity) {
        metadata = {};
        if (data.facilityType === 'arena' && data.actDimensions) metadata.dimensions = data.actDimensions;
        if (data.facilityType === 'round_pen' && data.actDiameter) metadata.diameter = data.actDiameter;
        metadata.covered = data.actCovered;
        if (data.facilityType !== 'wash_area') metadata.footing = data.actFooting;
        if (data.facilityType === 'wash_area') {
          if (data.actWashPoints) metadata.wash_points = Number(data.actWashPoints);
          metadata.water_type = data.actWaterType;
        }
      }

      const newArea = await createArea({
        branch_id: createdBranchId,
        name: data.name,
        name_ar: data.nameAr || undefined,
        code: data.code || undefined,
        facility_type: data.facilityType,
        capacity: isOpenArea && data.capacity ? Number(data.capacity) : undefined,
        area_size: isOpenArea && data.areaSize ? Number(data.areaSize) : undefined,
        shade: isOpenArea ? data.shade : undefined,
        has_water: isOpenArea ? data.hasWater : undefined,
        metadata,
      });

      if (isHousing && data.unitCount > 0 && newArea?.id) {
        const defaultUnitType = data.facilityType === 'isolation' ? 'isolation_room' : 'stall';
        for (const room of data.previewRooms) {
          const unitType = room.fn === 'default' ? defaultUnitType : room.fn;
          await createUnit({
            branch_id: createdBranchId,
            area_id: newArea.id,
            code: room.code,
            name: room.code,
            unit_type: unitType as any,
            occupancy: 'single',
            capacity: 1,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expanded-branch-detail'] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });

      toast.success(t('housing.branchWizard.success'));
      handleClose(false);
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip facilities — just close since branch already created
  const handleSkipFacilities = () => {
    toast.success(t('housing.branchWizard.success'));
    handleClose(false);
  };

  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!grid-rows-none !grid-cols-none !flex !flex-col max-h-[85vh] sm:max-w-3xl p-0 gap-0">
        {/* Fixed header — shrink-0, never scrolls */}
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {t('housing.branchWizard.title')}
            </DialogTitle>
            <DialogDescription>
              {step === 1 ? t('housing.branchWizard.step1Desc') : t('housing.branchWizard.step2Desc')}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center gap-2 pt-3">
            <StepIndicator step={1} currentStep={step} label={t('housing.branchWizard.stepIdentity')} />
            <div className="flex-1 h-px bg-border" />
            <StepIndicator step={2} currentStep={step} label={t('housing.branchWizard.stepFacilities')} />
          </div>

          {/* Branch identity anchor in Step 2 */}
          {step === 2 && createdBranchId && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{branchName}</p>
                {(branchNameAr || city) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {branchNameAr && <span>{branchNameAr}</span>}
                    {branchNameAr && city && <span className="mx-1">·</span>}
                    {city && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 inline" />
                        {city}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable body — flex-1 min-h-0, only region that scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('housing.branchWizard.branchName')} *</Label>
                <Input
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder={t('housing.branchWizard.branchNamePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>{t('housing.branchWizard.branchNameAr')}</Label>
                <Input
                  value={branchNameAr}
                  onChange={e => setBranchNameAr(e.target.value)}
                  placeholder={t('housing.branchWizard.branchNameArPlaceholder')}
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('housing.branchWizard.city')}</Label>
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={t('housing.branchWizard.cityPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('housing.branchWizard.address')}</Label>
                  <Input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={t('housing.branchWizard.addressPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && createdBranchId && (
            <FacilityCreationForm
              lockedBranchId={createdBranchId}
              onFormDataChange={handleFacilityDataChange}
              onValidityChange={handleFacilityValidityChange}
            />
          )}
        </div>

        {/* Fixed footer — shrink-0, never scrolls */}
        <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between">
          {step === 2 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={isSubmitting}>
              <BackIcon className="h-4 w-4" />
              {t('common.back')}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button size="sm" onClick={handleProceedToStep2} disabled={!canProceedStep1 || isSubmitting || isCreating} className="gap-1.5">
                {(isSubmitting || isCreating) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('common.next')}
                <NextIcon className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" size="sm" onClick={handleSkipFacilities} disabled={isSubmitting}>
                  {t('housing.branchWizard.skipFacilities')}
                </Button>
                <Button size="sm" onClick={handleCreateFacility} disabled={!isFacilityValid || isSubmitting} className="gap-1.5">
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t('housing.branchWizard.createBranch')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = currentStep === step;
  const isDone = currentStep > step;

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
        isActive ? "bg-primary text-primary-foreground" :
        isDone ? "bg-primary/20 text-primary" :
        "bg-muted text-muted-foreground"
      )}>
        {step}
      </div>
      <span className={cn(
        "text-xs hidden sm:inline",
        isActive ? "text-foreground font-medium" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
