import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseMovements, type MovementType, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecordMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = ["type", "horse", "location", "details", "review"] as const;
type Step = typeof STEPS[number];

export function RecordMovementDialog({
  open,
  onOpenChange,
  onSuccess,
}: RecordMovementDialogProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>("type");
  const [formData, setFormData] = useState<{
    movementType: MovementType | null;
    horseId: string | null;
    fromLocationId: string | null;
    toLocationId: string | null;
    reason: string;
    notes: string;
    internalLocationNote: string;
  }>({
    movementType: null,
    horseId: null,
    fromLocationId: null,
    toLocationId: null,
    reason: "",
    notes: "",
    internalLocationNote: "",
  });

  const { horses } = useHorses();
  const { activeLocations } = useLocations();
  const { recordMovement, isRecording } = useHorseMovements();

  const stepIndex = STEPS.indexOf(step);
  const canGoNext = () => {
    switch (step) {
      case "type":
        return !!formData.movementType;
      case "horse":
        return !!formData.horseId;
      case "location":
        if (formData.movementType === "in") return !!formData.toLocationId;
        if (formData.movementType === "out") return !!formData.fromLocationId;
        if (formData.movementType === "transfer") {
          if (!formData.fromLocationId || !formData.toLocationId) return false;
          if (formData.fromLocationId === formData.toLocationId && !formData.internalLocationNote) return false;
          return true;
        }
        return false;
      case "details":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.movementType || !formData.horseId) return;

    const data: CreateMovementData = {
      horse_id: formData.horseId,
      movement_type: formData.movementType,
      from_location_id: formData.fromLocationId,
      to_location_id: formData.toLocationId,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
      internal_location_note: formData.internalLocationNote || undefined,
    };

    await recordMovement(data);
    onOpenChange(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setStep("type");
    setFormData({
      movementType: null,
      horseId: null,
      fromLocationId: null,
      toLocationId: null,
      reason: "",
      notes: "",
      internalLocationNote: "",
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const selectedHorse = horses.find(h => h.id === formData.horseId);
  const fromLocation = activeLocations.find(l => l.id === formData.fromLocationId);
  const toLocation = activeLocations.find(l => l.id === formData.toLocationId);

  const isSameBranchTransfer = formData.movementType === 'transfer' && 
    formData.fromLocationId && formData.toLocationId && 
    formData.fromLocationId === formData.toLocationId;

  const content = (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i <= stepIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {step === "type" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step1Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step1Desc")}</p>
            <div className="grid gap-3">
              {(["in", "out", "transfer"] as MovementType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, movementType: type })}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-start",
                    formData.movementType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    type === "in" ? "bg-emerald-100 text-emerald-600" :
                    type === "out" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {type === "in" && <ArrowDownToLine className="h-6 w-6" />}
                    {type === "out" && <ArrowUpFromLine className="h-6 w-6" />}
                    {type === "transfer" && <ArrowLeftRight className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t(`movement.types.${type}`)}</p>
                  </div>
                  {formData.movementType === type && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "horse" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step2Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step2Desc")}</p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => setFormData({ ...formData, horseId: horse.id })}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-lg border-2 transition-all text-start",
                    formData.horseId === horse.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={horse.avatar_url || undefined} />
                    <AvatarFallback>{horse.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{horse.name}</p>
                    {horse.name_ar && (
                      <p className="text-sm text-muted-foreground">{horse.name_ar}</p>
                    )}
                  </div>
                  {formData.horseId === horse.id && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "location" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step3Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step3Desc")}</p>
            
            {/* From Location (for OUT and TRANSFER) */}
            {(formData.movementType === "out" || formData.movementType === "transfer") && (
              <div className="space-y-2">
                <Label>{t("movement.form.fromLocation")}</Label>
                <Select
                  value={formData.fromLocationId || ""}
                  onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("movement.form.fromLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.city && `(${loc.city})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* To Location (for IN and TRANSFER) */}
            {(formData.movementType === "in" || formData.movementType === "transfer") && (
              <div className="space-y-2">
                <Label>{t("movement.form.toLocation")}</Label>
                <Select
                  value={formData.toLocationId || ""}
                  onValueChange={(value) => setFormData({ ...formData, toLocationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("movement.form.toLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.city && `(${loc.city})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Internal location note (required for same-branch transfer) */}
            {isSameBranchTransfer && (
              <div className="space-y-2">
                <Label className="text-amber-600">
                  {t("movement.form.internalLocationNote")} *
                </Label>
                <Input
                  value={formData.internalLocationNote}
                  onChange={(e) => setFormData({ ...formData, internalLocationNote: e.target.value })}
                  placeholder={t("movement.form.internalLocationNotePlaceholder")}
                  className="border-amber-300 focus:border-amber-500"
                />
                <p className="text-xs text-amber-600">
                  {t("movement.validation.internalNoteRequired")}
                </p>
              </div>
            )}
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step4Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step4Desc")}</p>
            
            <div className="space-y-2">
              <Label>{t("movement.form.reason")}</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder={t("movement.form.reasonPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("movement.form.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("movement.form.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step5Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step5Desc")}</p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {formData.movementType && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.movementType")}</span>
                  <MovementTypeBadge type={formData.movementType} />
                </div>
              )}
              
              {selectedHorse && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.selectHorse")}</span>
                  <span className="font-medium">{selectedHorse.name}</span>
                </div>
              )}

              {fromLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.fromLocation")}</span>
                  <span className="font-medium">{fromLocation.name}</span>
                </div>
              )}

              {toLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.toLocation")}</span>
                  <span className="font-medium">{toLocation.name}</span>
                </div>
              )}

              {formData.internalLocationNote && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.internalLocationNote")}</span>
                  <span className="font-medium">{formData.internalLocationNote}</span>
                </div>
              )}

              {formData.reason && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.reason")}</span>
                  <span className="font-medium">{formData.reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="gap-1"
        >
          {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {t("common.back")}
        </Button>

        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={isRecording}>
            {t("common.confirm")}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canGoNext()} className="gap-1">
            {t("common.next")}
            {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t("movement.form.recordMovement")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("movement.form.recordMovement")}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
