import { useState, useEffect } from "react";
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
import { User } from "lucide-react";
import { useI18n } from "@/i18n";
import { useBoardingAdmissions } from "@/hooks/housing/useBoardingAdmissions";
import { formatBilingualName } from "@/lib/displayHelpers";

// Pass 2 will replace this with emergency_contacts JSONB + MultiPhoneInput.
interface EmergencyContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
  currentValue: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
}

export function EmergencyContactDialog({
  open,
  onOpenChange,
  admissionId,
  currentValue,
  horseName,
  horseNameAr,
}: EmergencyContactDialogProps) {
  const { t, lang } = useI18n();
  const { updateAdmission } = useBoardingAdmissions();
  const [value, setValue] = useState(currentValue || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(currentValue || "");
  }, [open, currentValue]);

  const bilingualHorse = formatBilingualName(horseName, horseNameAr, lang);
  const dialogTitle = t(
    "housing.admissions.detail.emergencyContactDialogTitle"
  ).replace("{{name}}", bilingualHorse);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdmission({
        admissionId,
        emergency_contact: value.trim() || null,
      } as any);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="emergency-contact">
              {t("housing.admissions.wizard.emergencyContact")}
            </Label>
            <Input
              id="emergency-contact"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t(
                "housing.admissions.wizard.emergencyContactPlaceholder"
              )}
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("housing.admissions.detail.emergencyContactHelp")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
