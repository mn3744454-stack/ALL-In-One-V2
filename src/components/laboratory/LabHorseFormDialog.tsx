import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { useLabHorses, type CreateLabHorseData } from "@/hooks/laboratory/useLabHorses";
import { useCreatePartyHorseLink } from "@/hooks/laboratory/usePartyHorseLinks";
import { useI18n } from "@/i18n";
import type { SelectedHorse } from "./HorseSelectionStep";

interface LabHorseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (horse: SelectedHorse) => void;
  defaultClientId?: string;
}

export function LabHorseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultClientId,
}: LabHorseFormDialogProps) {
  const { t } = useI18n();
  const { createLabHorse, isCreating } = useLabHorses({});
  const { mutateAsync: createLink, isPending: isLinking } = useCreatePartyHorseLink();
  
  const [formData, setFormData] = useState<CreateLabHorseData>({
    name: "",
    name_ar: "",
    passport_number: "",
    microchip_number: "",
    breed_text: "",
    color_text: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    client_id: defaultClientId,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      passport_number: "",
      microchip_number: "",
      breed_text: "",
      color_text: "",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      client_id: defaultClientId,
    });
  };

  const handleSubmit = async () => {
    // Require at least one name
    if (!formData.name?.trim() && !formData.name_ar?.trim()) return;

    const created = await createLabHorse({
      name: formData.name?.trim() || formData.name_ar?.trim() || "",
      name_ar: formData.name_ar?.trim() || undefined,
      passport_number: formData.passport_number?.trim() || undefined,
      microchip_number: formData.microchip_number?.trim() || undefined,
      breed_text: formData.breed_text?.trim() || undefined,
      color_text: formData.color_text?.trim() || undefined,
      owner_name: formData.owner_name?.trim() || undefined,
      owner_phone: formData.owner_phone?.trim() || undefined,
      owner_email: formData.owner_email?.trim() || undefined,
      client_id: formData.client_id || undefined,
    });

    if (created) {
      // Create party-horse link if client is specified (UHP junction)
      if (formData.client_id) {
        await createLink({
          client_id: formData.client_id,
          lab_horse_id: created.id,
          relationship_type: 'lab_customer',
          is_primary: true,
        });
      }

      const newHorse: SelectedHorse = {
        horse_id: created.id,
        horse_type: 'lab_horse',
        horse_name: created.name,
        horse_data: {
          passport_number: created.passport_number || undefined,
          microchip: created.microchip_number || undefined,
          breed: created.breed_text || undefined,
          color: created.color_text || undefined,
        },
      };
      
      onSuccess?.(newHorse);
      resetForm();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isFormValid = (formData.name?.trim() || formData.name_ar?.trim());
  const isSubmitting = isCreating || isLinking;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("laboratory.labHorses.registerHorse")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1">
          {/* Name English & Arabic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lab-horse-name-en">
                {t("laboratory.labHorses.nameEn")} *
              </Label>
              <Input
                id="lab-horse-name-en"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter horse name"
                disabled={isCreating}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-horse-name-ar">
                {t("laboratory.labHorses.nameAr")}
              </Label>
              <Input
                id="lab-horse-name-ar"
                value={formData.name_ar || ""}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder={t("laboratory.labHorses.nameArPlaceholder")}
                disabled={isCreating}
                dir="rtl"
              />
            </div>
          </div>

          {/* Passport & Microchip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lab-horse-passport">
                {t("laboratory.walkIn.passportNumber")}
              </Label>
              <Input
                id="lab-horse-passport"
                value={formData.passport_number || ""}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                placeholder={t("laboratory.walkIn.passportPlaceholder")}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-horse-microchip">
                {t("laboratory.walkIn.microchip")}
              </Label>
              <Input
                id="lab-horse-microchip"
                value={formData.microchip_number || ""}
                onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
                placeholder={t("laboratory.walkIn.microchipPlaceholder")}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Breed & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lab-horse-breed">
                {t("laboratory.walkIn.breed")}
              </Label>
              <Input
                id="lab-horse-breed"
                value={formData.breed_text || ""}
                onChange={(e) => setFormData({ ...formData, breed_text: e.target.value })}
                placeholder={t("laboratory.walkIn.breedPlaceholder")}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-horse-color">
                {t("laboratory.walkIn.color")}
              </Label>
              <Input
                id="lab-horse-color"
                value={formData.color_text || ""}
                onChange={(e) => setFormData({ ...formData, color_text: e.target.value })}
                placeholder={t("laboratory.walkIn.colorPlaceholder")}
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Owner Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lab-horse-owner-name">
                {t("laboratory.labHorses.ownerName")}
              </Label>
              <Input
                id="lab-horse-owner-name"
                value={formData.owner_name || ""}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder={t("laboratory.labHorses.ownerNamePlaceholder")}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-horse-owner-phone">
                {t("laboratory.labHorses.ownerPhone")}
              </Label>
              <Input
                id="lab-horse-owner-phone"
                value={formData.owner_phone || ""}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                placeholder={t("laboratory.labHorses.ownerPhonePlaceholder")}
                disabled={isCreating}
                dir="ltr"
              />
            </div>
          </div>

          {/* Owner Email */}
          <div className="space-y-2">
            <Label htmlFor="lab-horse-owner-email">
              {t("laboratory.labHorses.ownerEmail")}
            </Label>
            <Input
              id="lab-horse-owner-email"
              type="email"
              value={formData.owner_email || ""}
              onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              placeholder={t("laboratory.labHorses.ownerEmailPlaceholder")}
              disabled={isCreating}
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 me-2" />
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Check className="h-4 w-4 me-2" />
            )}
            {t("laboratory.labHorses.registerAndSelect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
