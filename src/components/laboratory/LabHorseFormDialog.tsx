import { useMemo, useState } from "react";
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
import { useLabHorses, type CreateLabHorseData } from "@/hooks/laboratory/useLabHorses";
import { useCreatePartyHorseLink } from "@/hooks/laboratory/usePartyHorseLinks";
import { useI18n } from "@/i18n";
import { toast } from "@/hooks/use-toast";
import type { SelectedHorse } from "./HorseSelectionStep";

/**
 * SMOKE TEST: New Horse Links to Client
 * 1. In wizard with client selected, click "Register New Horse"
 * 2. Enter name "TestHorse456", save
 * 3. Expected: Success toast "Horse linked to client successfully"
 * 4. Expected: New horse appears in client's horse list immediately
 * 5. DB check: party_horse_links row with is_primary=true
 */

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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { isDirty, resetBaseline } = useDirtyForm(formData, open);

  const resetForm = () => {
    const next: CreateLabHorseData = {
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
    };
    setFormData(next);
    setAttemptedSubmit(false);
    resetBaseline(next);
  };

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!formData.name?.trim() && !formData.name_ar?.trim()) {
      issues.push(t("common.validation.enterHorseNameEnOrAr"));
    }
    return issues;
  }, [formData.name, formData.name_ar, t]);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (missingIssues.length > 0) return;

    // ARCHITECTURE NOTE: Do NOT write client_id to lab_horses table.
    // The party_horse_links junction table is the ONLY source of truth
    // for client↔horse relationships. See: set_primary_party_horse_link RPC.
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
    });

    if (created) {
      // Create party-horse link if client is specified (UHP junction - ONLY source of truth)
      if (formData.client_id) {
        try {
          await createLink({
            client_id: formData.client_id,
            lab_horse_id: created.id,
            relationship_type: 'lab_customer',
            is_primary: true,
          });
          toast({
            title: t("laboratory.toasts.horseLinkCreated"),
            variant: "default",
          });
        } catch (error) {
          console.error("Failed to create party-horse link:", error);
          toast({
            title: t("laboratory.toasts.horseLinkFailed"),
            variant: "destructive",
          });
          // Don't block the flow - horse was created successfully
        }
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

  const isSubmitting = isCreating || isLinking;

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Reset on intentional close (after discard confirm or success)
          resetForm();
        }
        onOpenChange(next);
      }}
      isDirty={isDirty}
      className="max-w-lg max-h-[90vh] flex flex-col"
    >
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

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 gap-3 flex-col sm:flex-row">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
            className="flex-1 w-full sm:w-auto"
          />
          <div className="flex gap-2 sm:ms-auto">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                <X className="h-4 w-4 me-2" />
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Check className="h-4 w-4 me-2" />
              )}
              {t("laboratory.labHorses.registerAndSelect")}
            </Button>
          </div>
        </DialogFooter>
    </SafeFormDialog>
  );
}
