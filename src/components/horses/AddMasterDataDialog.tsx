import { useState, useMemo, useEffect } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

export type MasterDataType =
  | "color"
  | "breed"
  | "branch"
  | "stable"
  | "housing_unit"
  | "breeder"
  | "owner";

interface AddMasterDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: MasterDataType;
  onCreate: (data: Record<string, string>) => Promise<{ data: unknown; error: Error | null }>;
  onSuccess?: (data: unknown) => void;
}

export const AddMasterDataDialog = ({
  open,
  onOpenChange,
  type,
  onCreate,
  onSuccess,
}: AddMasterDataDialogProps) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { isDirty } = useDirtyForm(formData, open);

  useEffect(() => {
    if (!open) {
      setAttemptedSubmit(false);
      setFormData({});
    }
  }, [open]);

  // Config is now inside component to access t() hook
  const typeConfig = useMemo(() => ({
    color: {
      title: t('horses.masterData.color.title'),
      fields: [
        { key: "name", label: t('horses.masterData.color.nameEn'), required: true },
        { key: "name_ar", label: t('horses.masterData.color.nameAr') },
      ],
    },
    breed: {
      title: t('horses.masterData.breed.title'),
      fields: [
        { key: "name", label: t('horses.masterData.breed.nameEn'), required: true },
        { key: "name_ar", label: t('horses.masterData.breed.nameAr') },
      ],
    },
    branch: {
      title: t('horses.masterData.branch.title'),
      fields: [
        { key: "name", label: t('horses.masterData.branch.name'), required: true },
        { key: "address", label: t('horses.masterData.branch.address') },
      ],
    },
    stable: {
      title: t('horses.masterData.stable.title'),
      fields: [{ key: "name", label: t('horses.masterData.stable.name'), required: true }],
    },
    housing_unit: {
      title: t('horses.masterData.housingUnit.title'),
      fields: [
        { key: "code", label: t('horses.masterData.housingUnit.code'), required: true },
        { key: "unit_type", label: t('horses.masterData.housingUnit.unitType') },
      ],
    },
    breeder: {
      title: t('horses.masterData.breeder.title'),
      fields: [
        { key: "name", label: t('horses.masterData.breeder.name'), required: true },
        { key: "name_ar", label: t('horses.masterData.breeder.nameAr') },
        { key: "phone", label: t('horses.masterData.breeder.phone') },
        { key: "email", label: t('horses.masterData.breeder.email') },
      ],
    },
    owner: {
      title: t('horses.masterData.owner.title'),
      fields: [
        { key: "name", label: t('horses.masterData.owner.name'), required: true },
        { key: "name_ar", label: t('horses.masterData.owner.nameAr') },
        { key: "phone", label: t('horses.masterData.owner.phone') },
        { key: "email", label: t('horses.masterData.owner.email') },
      ],
    },
  }), [t]);

  const config = typeConfig[type];

  const missingIssues = useMemo(() => {
    const requiredFields = config.fields.filter((f) => f.required);
    const missing = requiredFields.filter((f) => !formData[f.key]?.trim());
    return missing.map((f) =>
      f.key === "name"
        ? t('common.validation.enterRequiredName')
        : f.label,
    );
  }, [config.fields, formData, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (missingIssues.length > 0) {
      return;
    }

    setLoading(true);
    const { data, error } = await onCreate(formData);
    setLoading(false);

    if (error) {
      toast({
        title: t('horses.masterData.errorCreating'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('horses.masterData.createdSuccess'),
      description: t('horses.masterData.hasBeenAdded'),
    });

    setFormData({});
    onOpenChange(false);
    onSuccess?.(data);
  };

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="sm:max-w-md"
    >
      <DialogHeader>
        <DialogTitle>{config.title}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ms-1">*</span>}
            </Label>
            <Input
              id={field.key}
              value={formData[field.key] || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.label}
            />
          </div>
        ))}

        <MissingRequirementsBar
          issues={attemptedSubmit ? missingIssues : []}
          attempted={attemptedSubmit}
        />

        <div className="flex justify-end gap-2 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {t('common.create')}
          </Button>
        </div>
      </form>
    </SafeFormDialog>
  );
};
