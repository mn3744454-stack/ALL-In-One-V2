import { useEffect, useMemo, useState } from "react";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { useLabHorses, type LabHorse, type UpdateLabHorseData } from "@/hooks/laboratory/useLabHorses";
import { useI18n } from "@/i18n";

interface LabHorseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: LabHorse | null;
  onSuccess?: () => void;
}

export function LabHorseEditDialog({
  open,
  onOpenChange,
  horse,
  onSuccess,
}: LabHorseEditDialogProps) {
  const { t, dir } = useI18n();
  const { updateLabHorse, isUpdating } = useLabHorses({});

  const [formData, setFormData] = useState<UpdateLabHorseData>({
    name: "",
    name_ar: "",
    passport_number: "",
    microchip_number: "",
    breed_text: "",
    color_text: "",
    owner_name: "",
    owner_phone: "",
  });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { isDirty, resetBaseline } = useDirtyForm(formData, open);

  // Populate form when horse changes; rebaseline so seeded data isn't dirty.
  useEffect(() => {
    if (open && horse) {
      const seeded: UpdateLabHorseData = {
        name: horse.name || "",
        name_ar: horse.name_ar || "",
        passport_number: horse.passport_number || "",
        microchip_number: horse.microchip_number || "",
        breed_text: horse.breed_text || "",
        color_text: horse.color_text || "",
        owner_name: horse.owner_name || "",
        owner_phone: horse.owner_phone || "",
      };
      setFormData(seeded);
      setAttemptedSubmit(false);
      resetBaseline(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horse, open]);

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!formData.name?.trim() && !formData.name_ar?.trim()) {
      issues.push(t("common.validation.enterHorseNameEnOrAr"));
    }
    return issues;
  }, [formData.name, formData.name_ar, t]);

  const handleSubmit = async () => {
    if (!horse) return;
    setAttemptedSubmit(true);
    if (missingIssues.length > 0) return;

    const updated = await updateLabHorse(horse.id, {
      name: formData.name?.trim() || formData.name_ar?.trim() || "",
      name_ar: formData.name_ar?.trim() || undefined,
      passport_number: formData.passport_number?.trim() || undefined,
      microchip_number: formData.microchip_number?.trim() || undefined,
      breed_text: formData.breed_text?.trim() || undefined,
      color_text: formData.color_text?.trim() || undefined,
      owner_name: formData.owner_name?.trim() || undefined,
      owner_phone: formData.owner_phone?.trim() || undefined,
    });

    if (updated) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  const isFormValid = !!(formData.name?.trim() || formData.name_ar?.trim());

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="max-w-lg max-h-[90vh] flex flex-col"
      dir={dir}
    >
        <DialogHeader>
          <DialogTitle>
            {t("laboratory.labHorses.editHorse")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1">
          {/* Name English & Arabic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-name-en">
                {t("laboratory.labHorses.nameEn")} *
              </Label>
              <Input
                id="edit-lab-horse-name-en"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter horse name"
                disabled={isUpdating}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-name-ar">
                {t("laboratory.labHorses.nameAr")}
              </Label>
              <Input
                id="edit-lab-horse-name-ar"
                value={formData.name_ar || ""}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder={t("laboratory.labHorses.nameArPlaceholder")}
                disabled={isUpdating}
                dir="rtl"
              />
            </div>
          </div>

          {/* Passport & Microchip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-passport">
                {t("laboratory.walkIn.passportNumber")}
              </Label>
              <Input
                id="edit-lab-horse-passport"
                value={formData.passport_number || ""}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                placeholder={t("laboratory.walkIn.passportPlaceholder")}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-microchip">
                {t("laboratory.walkIn.microchip")}
              </Label>
              <Input
                id="edit-lab-horse-microchip"
                value={formData.microchip_number || ""}
                onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
                placeholder={t("laboratory.walkIn.microchipPlaceholder")}
                disabled={isUpdating}
              />
            </div>
          </div>

          {/* Breed & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-breed">
                {t("laboratory.walkIn.breed")}
              </Label>
              <Input
                id="edit-lab-horse-breed"
                value={formData.breed_text || ""}
                onChange={(e) => setFormData({ ...formData, breed_text: e.target.value })}
                placeholder={t("laboratory.walkIn.breedPlaceholder")}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-color">
                {t("laboratory.walkIn.color")}
              </Label>
              <Input
                id="edit-lab-horse-color"
                value={formData.color_text || ""}
                onChange={(e) => setFormData({ ...formData, color_text: e.target.value })}
                placeholder={t("laboratory.walkIn.colorPlaceholder")}
                disabled={isUpdating}
              />
            </div>
          </div>

          {/* Owner Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-owner-name">
                {t("laboratory.labHorses.ownerName")}
              </Label>
              <Input
                id="edit-lab-horse-owner-name"
                value={formData.owner_name || ""}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder={t("laboratory.labHorses.ownerNamePlaceholder")}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lab-horse-owner-phone">
                {t("laboratory.labHorses.ownerPhone")}
              </Label>
              <Input
                id="edit-lab-horse-owner-phone"
                value={formData.owner_phone || ""}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                placeholder={t("laboratory.labHorses.ownerPhonePlaceholder")}
                disabled={isUpdating}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 gap-3 sm:flex-row flex-col">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
            className="flex-1 w-full sm:w-auto"
          />
          <div className="flex gap-2 sm:ms-auto w-full sm:w-auto">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 me-2" />
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Check className="h-4 w-4 me-2" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
    </SafeFormDialog>
  );
}
