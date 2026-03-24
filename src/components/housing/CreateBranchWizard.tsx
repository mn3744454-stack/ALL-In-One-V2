import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Loader2, ChevronRight, ChevronLeft, Warehouse } from "lucide-react";
import { useI18n } from "@/i18n";
import { useLocations } from "@/hooks/movement/useLocations";
import { useFacilityAreas, FACILITY_TYPES, type FacilityType } from "@/hooks/housing/useFacilityAreas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface FacilityRow {
  name: string;
  type: FacilityType;
}

interface CreateBranchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBranchWizard({ open, onOpenChange }: CreateBranchWizardProps) {
  const { t, dir } = useI18n();
  const { createLocation, isCreating } = useLocations();
  const { createArea } = useFacilityAreas();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 fields
  const [branchName, setBranchName] = useState("");
  const [branchNameAr, setBranchNameAr] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 fields
  const [facilities, setFacilities] = useState<FacilityRow[]>([
    { name: "", type: "barn" },
  ]);

  const resetForm = () => {
    setStep(1);
    setBranchName("");
    setBranchNameAr("");
    setCity("");
    setAddress("");
    setFacilities([{ name: "", type: "barn" }]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const addFacilityRow = () => {
    setFacilities(prev => [...prev, { name: "", type: "barn" }]);
  };

  const removeFacilityRow = (idx: number) => {
    setFacilities(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFacility = (idx: number, field: keyof FacilityRow, value: string) => {
    setFacilities(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const canProceedStep1 = branchName.trim().length > 0;

  const handleSubmit = async () => {
    if (!canProceedStep1) return;
    setIsSubmitting(true);

    try {
      // Create the branch
      const newBranch = await createLocation({
        name: branchName.trim(),
        name_ar: branchNameAr.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });

      // Create facilities (non-empty rows)
      const validFacilities = facilities.filter(f => f.name.trim());
      for (const facility of validFacilities) {
        await createArea({
          branch_id: newBranch.id,
          name: facility.name.trim(),
          facility_type: facility.type,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expanded-branch-detail'] });

      toast.success(t('housing.branchWizard.success'));
      handleClose(false);
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
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
        <div className="flex items-center gap-2 py-2">
          <StepIndicator step={1} currentStep={step} label={t('housing.branchWizard.stepIdentity')} />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator step={2} currentStep={step} label={t('housing.branchWizard.stepFacilities')} />
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
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

        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t('housing.branchWizard.facilitiesHint')}</p>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {facilities.map((facility, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={facility.name}
                      onChange={e => updateFacility(idx, 'name', e.target.value)}
                      placeholder={`${t('housing.branchWizard.facilityNamePlaceholder')} ${idx + 1}`}
                      className="text-sm"
                    />
                  </div>
                  <Select
                    value={facility.type}
                    onValueChange={v => updateFacility(idx, 'type', v)}
                  >
                    <SelectTrigger className="w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map(ft => (
                        <SelectItem key={ft} value={ft} className="text-xs">
                          {t(`housing.facilityTypes.${ft}` as any)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {facilities.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFacilityRow(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={addFacilityRow}>
              <Plus className="h-3.5 w-3.5" />
              {t('housing.branchWizard.addFacility')}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
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
              <Button size="sm" onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-1.5">
                {t('common.next')}
                <NextIcon className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setFacilities([]); handleSubmit(); }} disabled={isSubmitting}>
                  {t('housing.branchWizard.skipFacilities')}
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
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
