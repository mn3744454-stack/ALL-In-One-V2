import { useMemo, useState } from "react";
import { useHorses } from "@/hooks/useHorses";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
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
import { Plus, Heart } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface AddHorseDialogProps {
  trigger?: React.ReactNode;
}

const EMPTY = {
  name: "",
  gender: "" as "male" | "female" | "",
  breed: "",
  color: "",
  birth_date: "",
  registration_number: "",
  microchip_number: "",
  notes: "",
};

export const AddHorseDialog = ({ trigger }: AddHorseDialogProps) => {
  const { t } = useI18n();
  const { createHorse } = useHorses();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [formData, setFormData] = useState(EMPTY);

  const { isDirty, resetBaseline } = useDirtyForm(formData, open);

  const nameValid = formData.name.trim().length > 0;
  const genderValid = formData.gender === "male" || formData.gender === "female";

  const missingIssues = useMemo<string[]>(() => {
    const out: string[] = [];
    if (!nameValid) out.push(t("horses.addLegacy.missing.name"));
    if (!genderValid) out.push(t("horses.addLegacy.missing.gender"));
    return out;
  }, [nameValid, genderValid, t]);

  const effectiveIsDirty = isDirty && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!nameValid || !genderValid) return;

    setLoading(true);
    const { error } = await createHorse({
      name: formData.name,
      gender: formData.gender as "male" | "female",
      breed: formData.breed || undefined,
      color: formData.color || undefined,
      birth_date: formData.birth_date || undefined,
      registration_number: formData.registration_number || undefined,
      microchip_number: formData.microchip_number || undefined,
      notes: formData.notes || undefined,
    });
    setLoading(false);

    if (error) {
      toast.error(t("horses.addError"));
    } else {
      toast.success(t("horses.addSuccess").replace("{{name}}", formData.name));
      resetBaseline(EMPTY);
      setOpen(false);
      setFormData(EMPTY);
      setAttemptedSubmit(false);
    }
  };

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        className="inline-flex"
        role="presentation"
      >
        {trigger || (
          <Button variant="gold" size="icon" className="sm:w-auto sm:px-3 sm:gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("horses.addHorse")}</span>
          </Button>
        )}
      </span>

      <SafeFormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setAttemptedSubmit(false);
        }}
        isDirty={effectiveIsDirty}
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-gold" />
            {t("horses.addLegacy.title")}
          </DialogTitle>
          <DialogDescription>{t("horses.addLegacy.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("horses.wizard.name")} *</Label>
              <Input
                id="name"
                placeholder={t("horses.addLegacy.namePlaceholder")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-invalid={attemptedSubmit && !nameValid}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("horses.wizard.gender")} *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value as "male" | "female" })
                }
              >
                <SelectTrigger aria-invalid={attemptedSubmit && !genderValid}>
                  <SelectValue placeholder={t("horses.addLegacy.selectGender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("horses.addLegacy.maleStallion")}</SelectItem>
                  <SelectItem value="female">{t("horses.addLegacy.femaleMare")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="breed">{t("horses.wizard.breed")}</Label>
              <Input
                id="breed"
                placeholder={t("horses.addLegacy.breedPlaceholder")}
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">{t("horses.wizard.color")}</Label>
              <Input
                id="color"
                placeholder={t("horses.addLegacy.colorPlaceholder")}
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">{t("horses.wizard.birthDate")}</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_number">{t("horses.addLegacy.registrationNumber")}</Label>
              <Input
                id="registration_number"
                placeholder={t("horses.addLegacy.optional")}
                value={formData.registration_number}
                onChange={(e) =>
                  setFormData({ ...formData, registration_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="microchip_number">{t("horses.addLegacy.microchipNumber")}</Label>
              <Input
                id="microchip_number"
                placeholder={t("horses.addLegacy.optional")}
                value={formData.microchip_number}
                onChange={(e) =>
                  setFormData({ ...formData, microchip_number: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("horses.addLegacy.notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("horses.addLegacy.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? t("horses.addLegacy.adding") : t("horses.addHorse")}
            </Button>
          </div>
        </form>
      </SafeFormDialog>
    </>
  );
};
