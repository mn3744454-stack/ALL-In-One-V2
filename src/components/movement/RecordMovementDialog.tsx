import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseMovements, type MovementType, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { useExternalLocations } from "@/hooks/movement/useExternalLocations";
import { useConnectedDestinations } from "@/hooks/movement/useConnectedDestinations";
import { useConnectedMovement } from "@/hooks/movement/useConnectedMovement";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { usePermissions } from "@/hooks/usePermissions";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { HousingSelector } from "./HousingSelector";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Check, ChevronLeft, ChevronRight, Building2, DoorOpen, MapPin, Plus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecordMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type DestinationType = 'internal' | 'external' | 'connected';

const ALL_STEPS = ["type", "horse", "location", "housing", "details", "review"] as const;
type Step = typeof ALL_STEPS[number];

export function RecordMovementDialog({
  open, onOpenChange, onSuccess,
}: RecordMovementDialogProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>("type");
  const [formData, setFormData] = useState<{
    movementType: MovementType | null;
    horseId: string | null;
    destinationType: DestinationType;
    fromLocationId: string | null;
    toLocationId: string | null;
    toExternalLocationId: string | null;
    fromExternalLocationId: string | null;
    connectedTenantId: string | null;
    toAreaId: string | null;
    toUnitId: string | null;
    reason: string;
    notes: string;
    internalLocationNote: string;
  }>({
    movementType: null, horseId: null, destinationType: 'internal',
    fromLocationId: null, toLocationId: null,
    toExternalLocationId: null, fromExternalLocationId: null,
    connectedTenantId: null,
    toAreaId: null, toUnitId: null,
    reason: "", notes: "", internalLocationNote: "",
  });

  // Inline new external location form
  const [showNewExternal, setShowNewExternal] = useState(false);
  const [newExtName, setNewExtName] = useState('');
  const [newExtCity, setNewExtCity] = useState('');
  const [newExtType, setNewExtType] = useState('other');

  const { horses } = useHorses();
  const { activeLocations } = useLocations();
  const { recordMovement, isRecording } = useHorseMovements();
  const { externalLocations, createExternalLocation, isCreating: isCreatingExternal } = useExternalLocations();
  const { destinations: connectedDestinations } = useConnectedDestinations();
  const { recordConnectedMovement, isRecording: isRecordingConnected } = useConnectedMovement();
  const { hasPermission, isOwner } = usePermissions();
  
  const canSendConnected = isOwner || hasPermission('movement.connected.create');
  
  // For housing step display in review
  const { activeAreas } = useFacilityAreas(formData.toLocationId || undefined);
  const { activeUnits } = useHousingUnits(formData.toLocationId || undefined, formData.toAreaId || undefined);

  const stepIndex = ALL_STEPS.indexOf(step);
  
  // Skip housing step for OUT movements
  const effectiveSteps: readonly Step[] = formData.movementType === "out" 
    ? ALL_STEPS.filter(s => s !== "housing") 
    : ALL_STEPS;

  const canGoNext = () => {
    switch (step) {
      case "type":
        return !!formData.movementType;
      case "horse":
        return !!formData.horseId;
      case "location":
        if (formData.destinationType === 'external') {
          // External: need an external location selected (or for OUT just from_location)
          if (formData.movementType === 'out') return !!formData.fromLocationId && !!formData.toExternalLocationId;
          if (formData.movementType === 'in') return !!formData.toLocationId;
          return false;
        }
        // Internal (original logic)
        if (formData.movementType === "in") return !!formData.toLocationId;
        if (formData.movementType === "out") return !!formData.fromLocationId;
        if (formData.movementType === "transfer") {
          if (!formData.fromLocationId || !formData.toLocationId) return false;
          if (formData.fromLocationId === formData.toLocationId && !formData.internalLocationNote) return false;
          return true;
        }
        return false;
      case "housing":
        // Housing is optional, always can proceed
        return true;
      case "details":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = effectiveSteps.indexOf(step);
    if (currentIndex < effectiveSteps.length - 1) {
      setStep(effectiveSteps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = effectiveSteps.indexOf(step);
    if (currentIndex > 0) {
      setStep(effectiveSteps[currentIndex - 1]);
    }
  };

  const handleHousingSkip = () => {
    // Just move to next step, keeping toAreaId and toUnitId as null
    handleNext();
  };

  const handleSubmit = async () => {
    if (!formData.movementType || !formData.horseId) return;

    const selectedHorse = horses.find(h => h.id === formData.horseId);
    
    const data: CreateMovementData = {
      horse_id: formData.horseId,
      movement_type: formData.movementType,
      from_location_id: formData.fromLocationId,
      to_location_id: formData.toLocationId,
      from_area_id: selectedHorse?.current_area_id || null,
      from_unit_id: selectedHorse?.housing_unit_id || null,
      to_area_id: formData.toAreaId,
      to_unit_id: formData.toUnitId,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
      internal_location_note: formData.internalLocationNote || undefined,
      clear_housing: formData.movementType === 'out',
      destination_type: formData.destinationType,
      from_external_location_id: formData.fromExternalLocationId,
      to_external_location_id: formData.toExternalLocationId,
    };

    await recordMovement(data);
    onOpenChange(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setStep("type");
    setFormData({
      movementType: null, horseId: null, destinationType: 'internal',
      fromLocationId: null, toLocationId: null,
      toExternalLocationId: null, fromExternalLocationId: null,
      toAreaId: null, toUnitId: null,
      reason: "", notes: "", internalLocationNote: "",
    });
    setShowNewExternal(false);
    setNewExtName('');
    setNewExtCity('');
    setNewExtType('other');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const selectedHorse = horses.find(h => h.id === formData.horseId);
  const fromLocation = activeLocations.find(l => l.id === formData.fromLocationId);
  const toLocation = activeLocations.find(l => l.id === formData.toLocationId);
  const toExtLocation = externalLocations.find(l => l.id === formData.toExternalLocationId);
  const fromExtLocation = externalLocations.find(l => l.id === formData.fromExternalLocationId);
  const selectedArea = activeAreas.find(a => a.id === formData.toAreaId);
  const selectedUnit = activeUnits.find(u => u.id === formData.toUnitId);

  const isSameBranchTransfer = formData.destinationType === 'internal' && formData.movementType === 'transfer' && 
    formData.fromLocationId && formData.toLocationId && 
    formData.fromLocationId === formData.toLocationId;

  const content = (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {effectiveSteps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              effectiveSteps.indexOf(step) >= i ? "bg-primary" : "bg-muted"
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

            {/* Destination type toggle — show for OUT movements */}
            {formData.movementType === "out" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, destinationType: 'internal', toExternalLocationId: null })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all",
                    formData.destinationType === 'internal'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  {t("movement.destination.internal")}
                </button>
                <button
                  onClick={() => setFormData({ ...formData, destinationType: 'external', toLocationId: null, toAreaId: null, toUnitId: null })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all",
                    formData.destinationType === 'external'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  {t("movement.destination.external")}
                </button>
              </div>
            )}
            
            {/* From Location (for OUT and TRANSFER) — always internal */}
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

            {/* To Location — Internal */}
            {(formData.movementType === "in" || formData.movementType === "transfer" || (formData.movementType === "out" && formData.destinationType === "internal")) && (
              <div className="space-y-2">
                <Label>{t("movement.form.toLocation")}</Label>
                <Select
                  value={formData.toLocationId || ""}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    toLocationId: value,
                    toAreaId: null,
                    toUnitId: null,
                  })}
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

            {/* To Location — External */}
            {formData.movementType === "out" && formData.destinationType === "external" && (
              <div className="space-y-3">
                <Label>{t("movement.destination.externalLocation")}</Label>
                {!showNewExternal ? (
                  <>
                    <Select
                      value={formData.toExternalLocationId || ""}
                      onValueChange={(value) => setFormData({ ...formData, toExternalLocationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("movement.destination.selectExternal")} />
                      </SelectTrigger>
                      <SelectContent>
                        {externalLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.city && `(${loc.city})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 w-full"
                      onClick={() => setShowNewExternal(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("movement.destination.addNew")}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                    <Input
                      value={newExtName}
                      onChange={(e) => setNewExtName(e.target.value)}
                      placeholder={t("movement.destination.locationName")}
                    />
                    <Input
                      value={newExtCity}
                      onChange={(e) => setNewExtCity(e.target.value)}
                      placeholder={t("movement.destination.city")}
                    />
                    <Select value={newExtType} onValueChange={setNewExtType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['stable', 'clinic', 'venue', 'farm', 'other'].map(lt => (
                          <SelectItem key={lt} value={lt}>{t(`movement.destination.types.${lt}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setShowNewExternal(false); setNewExtName(''); setNewExtCity(''); setNewExtType('other'); }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={!newExtName.trim() || isCreatingExternal}
                        onClick={async () => {
                          const created = await createExternalLocation({ name: newExtName.trim(), city: newExtCity.trim() || undefined, location_type: newExtType });
                          setFormData({ ...formData, toExternalLocationId: created.id });
                          setShowNewExternal(false);
                          setNewExtName(''); setNewExtCity(''); setNewExtType('other');
                        }}
                      >
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                )}
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

        {step === "housing" && (
          <HousingSelector
            branchId={formData.toLocationId}
            selectedAreaId={formData.toAreaId}
            selectedUnitId={formData.toUnitId}
            onAreaChange={(areaId) => setFormData({ ...formData, toAreaId: areaId })}
            onUnitChange={(unitId) => setFormData({ ...formData, toUnitId: unitId })}
            onSkip={handleHousingSkip}
          />
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

              {toExtLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.destination.externalLocation")}</span>
                  <div className="text-end">
                    <span className="font-medium">{toExtLocation.name}</span>
                    {toExtLocation.city && <span className="text-xs text-muted-foreground ms-1">({toExtLocation.city})</span>}
                  </div>
                </div>
              )}

              {/* Housing info in review */}
              {(selectedArea || selectedUnit) && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.labels.currentHousing")}</span>
                  <div className={cn("flex items-center gap-2", dir === 'rtl' && "flex-row-reverse")}>
                    {selectedArea && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {dir === 'rtl' && selectedArea.name_ar ? selectedArea.name_ar : selectedArea.name}
                      </Badge>
                    )}
                    {selectedUnit && (
                      <Badge className="gap-1">
                        <DoorOpen className="h-3 w-3" />
                        {selectedUnit.code}
                      </Badge>
                    )}
                  </div>
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
          disabled={effectiveSteps.indexOf(step) === 0}
          className="gap-1"
        >
          {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {t("common.back")}
        </Button>

        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={isRecording}>
            {t("common.confirm")}
          </Button>
        ) : step === "housing" ? (
          <Button onClick={handleNext} className="gap-1">
            {t("common.next")}
            {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
