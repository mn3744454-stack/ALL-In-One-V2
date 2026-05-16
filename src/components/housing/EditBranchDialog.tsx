import { useMemo, useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useLocations } from "@/hooks/movement/useLocations";

interface EditBranchDialogProps {
  branch: { id: string; name: string; name_ar?: string | null; city: string | null; address: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBranchDialog({ branch, open, onOpenChange }: EditBranchDialogProps) {
  const { t } = useI18n();
  const { updateLocation, isUpdating } = useLocations();

  const [form, setForm] = useState({
    name: branch.name,
    nameAr: branch.name_ar || "",
    city: branch.city || "",
    address: branch.address || "",
  });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Re-seed form when reopened against a different branch.
  useMemo(() => {
    if (open) {
      setForm({
        name: branch.name,
        nameAr: branch.name_ar || "",
        city: branch.city || "",
        address: branch.address || "",
      });
      setAttemptedSubmit(false);
    }
  }, [open, branch]);

  const { isDirty, resetBaseline } = useDirtyForm(form, open);

  const nameValid = form.name.trim().length > 0;
  const missingIssues = useMemo<string[]>(() => {
    const out: string[] = [];
    if (!nameValid) out.push(t("housing.branchActions.missing.name"));
    return out;
  }, [nameValid, t]);

  const handleSave = async () => {
    setAttemptedSubmit(true);
    if (!nameValid) return;
    await updateLocation({
      id: branch.id,
      name: form.name.trim(),
      name_ar: form.nameAr.trim() || undefined,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
    });
    resetBaseline(form);
    onOpenChange(false);
  };

  const effectiveIsDirty = isDirty && !isUpdating;

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={effectiveIsDirty}
      className="sm:max-w-md"
    >
      <DialogHeader>
        <DialogTitle>{t("housing.branchActions.edit")}</DialogTitle>
        <DialogDescription>{t("housing.branchActions.editDesc")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>{t("housing.branchWizard.branchName")} *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t("housing.branchWizard.branchNamePlaceholder")}
            aria-invalid={attemptedSubmit && !nameValid}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("housing.branchWizard.branchNameAr")}</Label>
          <Input
            value={form.nameAr}
            onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
            placeholder={t("housing.branchWizard.branchNameArPlaceholder")}
            dir="rtl"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("housing.branchWizard.city")}</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder={t("housing.branchWizard.cityPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("housing.branchWizard.address")}</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder={t("housing.branchWizard.addressPlaceholder")}
            />
          </div>
        </div>
      </div>
      <MissingRequirementsBar
        issues={attemptedSubmit ? missingIssues : []}
        attempted={attemptedSubmit}
        className="mt-2"
      />
      <div className="flex justify-end gap-2 pt-3 border-t mt-3">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          {t("common.update")}
        </Button>
      </div>
    </SafeFormDialog>
  );
}
