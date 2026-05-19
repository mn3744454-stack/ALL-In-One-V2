import { useState, useEffect, useMemo } from "react";
import { DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { MultiPhoneInput, PhoneEntry } from "@/components/shared/contact/MultiPhoneInput";
import type { OwnerType, CreateOwnerPayload } from "@/hooks/useHorseMasterData";

interface AddOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateOwnerPayload) => Promise<{ data: unknown; error: Error | null }>;
  onSuccess?: (data: unknown) => void;
}

interface OwnerFormState {
  owner_type: OwnerType;
  name: string;
  name_ar: string;
  email: string;
  phones: PhoneEntry[];
  rep_name: string;
  rep_name_ar: string;
  rep_title: string;
  rep_email: string;
  rep_phones: PhoneEntry[];
}

const emptyState = (): OwnerFormState => ({
  owner_type: "individual",
  name: "",
  name_ar: "",
  email: "",
  phones: [],
  rep_name: "",
  rep_name_ar: "",
  rep_title: "",
  rep_email: "",
  rep_phones: [],
});

export function AddOwnerDialog({ open, onOpenChange, onCreate, onSuccess }: AddOwnerDialogProps) {
  const { t, lang } = useI18n();
  const isArabicUI = lang === "ar";
  const [form, setForm] = useState<OwnerFormState>(emptyState());
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [repOpen, setRepOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(emptyState());
      setAttempted(false);
      setRepOpen(false);
    }
  }, [open]);

  // Auto-expand rep section for organizations (but only once on type change while empty)
  useEffect(() => {
    if (form.owner_type === "organization") setRepOpen(true);
  }, [form.owner_type]);

  const { isDirty } = useDirtyForm(form, open);

  const repHasContent = !!(
    form.rep_name.trim() ||
    form.rep_name_ar.trim() ||
    form.rep_title.trim() ||
    form.rep_email.trim() ||
    form.rep_phones.some((p) => p.number?.trim())
  );

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    // Owner name bilingual rules (Phase 1)
    if (isArabicUI) {
      if (!form.name_ar.trim()) issues.push(t("common.validation.enterRequiredArabicName"));
      if (!form.name.trim()) issues.push(t("common.validation.enterRequiredEnglishName"));
    } else {
      if (!form.name.trim()) issues.push(t("common.validation.enterRequiredEnglishName"));
    }
    // Representative name only if rep section used
    if (repHasContent) {
      if (isArabicUI) {
        if (!form.rep_name_ar.trim()) issues.push(t("horses.masterData.owner.repNameRequiredAr"));
        if (!form.rep_name.trim()) issues.push(t("horses.masterData.owner.repNameRequiredEn"));
      } else {
        if (!form.rep_name.trim()) issues.push(t("horses.masterData.owner.repNameRequiredEn"));
      }
    }
    return issues;
  }, [form, isArabicUI, repHasContent, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missingIssues.length > 0) return;

    setLoading(true);
    const payload: CreateOwnerPayload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      email: form.email.trim() || null,
      owner_type: form.owner_type,
      phones: form.phones.filter((p) => p.number?.trim()),
      representative_name: form.rep_name.trim() || null,
      representative_name_ar: form.rep_name_ar.trim() || null,
      representative_title: form.rep_title.trim() || null,
      representative_email: form.rep_email.trim() || null,
      representative_phones: form.rep_phones.filter((p) => p.number?.trim()),
    };
    const { data, error } = await onCreate(payload);
    setLoading(false);

    if (error) {
      console.error("[horses.owner] create error", error);
      toast({
        title: t("horses.masterData.errorCreating"),
        description: t("horses.errors.saveFailed.description"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("horses.masterData.createdSuccess"),
      description: t("horses.masterData.hasBeenAdded"),
    });
    onOpenChange(false);
    onSuccess?.(data);
  };

  // Field order: AR UI shows Arabic name first
  const ownerNameFields = isArabicUI
    ? (
        <>
          <FieldBlock
            label={t("horses.masterData.owner.nameAr")}
            required
            value={form.name_ar}
            dir="rtl"
            onChange={(v) => setForm((s) => ({ ...s, name_ar: v }))}
          />
          <FieldBlock
            label={t("horses.masterData.owner.nameEn")}
            required
            value={form.name}
            dir="ltr"
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
            hint={t("horses.masterData.bilingualNameHint")}
          />
        </>
      )
    : (
        <>
          <FieldBlock
            label={t("horses.masterData.owner.nameEn")}
            required
            value={form.name}
            dir="ltr"
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
          />
          <FieldBlock
            label={t("horses.masterData.owner.nameAr")}
            value={form.name_ar}
            dir="rtl"
            onChange={(v) => setForm((s) => ({ ...s, name_ar: v }))}
          />
        </>
      );

  const repNameFields = isArabicUI
    ? (
        <>
          <FieldBlock
            label={t("horses.masterData.owner.representativeNameAr")}
            required={repHasContent}
            value={form.rep_name_ar}
            dir="rtl"
            onChange={(v) => setForm((s) => ({ ...s, rep_name_ar: v }))}
          />
          <FieldBlock
            label={t("horses.masterData.owner.representativeName")}
            required={repHasContent}
            value={form.rep_name}
            dir="ltr"
            onChange={(v) => setForm((s) => ({ ...s, rep_name: v }))}
          />
        </>
      )
    : (
        <>
          <FieldBlock
            label={t("horses.masterData.owner.representativeName")}
            required={repHasContent}
            value={form.rep_name}
            dir="ltr"
            onChange={(v) => setForm((s) => ({ ...s, rep_name: v }))}
          />
          <FieldBlock
            label={t("horses.masterData.owner.representativeNameAr")}
            value={form.rep_name_ar}
            dir="rtl"
            onChange={(v) => setForm((s) => ({ ...s, rep_name_ar: v }))}
          />
        </>
      );

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="sm:max-w-2xl max-h-[85vh] flex flex-col"
    >
      <DialogHeader className="shrink-0">
        <DialogTitle>{t("horses.masterData.owner.title")}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto px-1 space-y-6 py-2">
          {/* Owner Type */}
          <section className="space-y-2">
            <Label>{t("horses.masterData.owner.ownerType")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["individual", "organization"] as OwnerType[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, owner_type: opt }))}
                  className={`h-10 rounded-md border text-sm transition-colors ${
                    form.owner_type === opt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted/50"
                  }`}
                >
                  {opt === "individual"
                    ? t("horses.masterData.owner.ownerTypeIndividual")
                    : t("horses.masterData.owner.ownerTypeOrganization")}
                </button>
              ))}
            </div>
          </section>

          {/* Basic Info */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("horses.masterData.owner.basicInfo")}
            </h3>
            {ownerNameFields}
            <FieldBlock
              label={t("horses.masterData.owner.ownerEmail")}
              value={form.email}
              dir="ltr"
              type="email"
              onChange={(v) => setForm((s) => ({ ...s, email: v }))}
            />
          </section>

          {/* Owner Phones */}
          <section>
            <MultiPhoneInput
              phones={form.phones}
              onChange={(phones) => setForm((s) => ({ ...s, phones }))}
              labelNamespace="owners"
            />
          </section>

          {/* Representative */}
          <section className="border rounded-lg">
            <button
              type="button"
              onClick={() => setRepOpen((v) => !v)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/40 rounded-lg"
            >
              <span>{t("horses.masterData.owner.representativeSection")}</span>
              {repOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {repOpen && (
              <div className="p-3 pt-0 space-y-3 border-t">
                {repNameFields}
                <FieldBlock
                  label={t("horses.masterData.owner.representativeTitle")}
                  value={form.rep_title}
                  onChange={(v) => setForm((s) => ({ ...s, rep_title: v }))}
                />
                <FieldBlock
                  label={t("horses.masterData.owner.representativeEmail")}
                  value={form.rep_email}
                  dir="ltr"
                  type="email"
                  onChange={(v) => setForm((s) => ({ ...s, rep_email: v }))}
                />
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    {t("horses.masterData.owner.representativePhones")}
                  </Label>
                  <MultiPhoneInput
                    phones={form.rep_phones}
                    onChange={(rep_phones) => setForm((s) => ({ ...s, rep_phones }))}
                    labelNamespace="owners"
                  />
                </div>
              </div>
            )}
          </section>

          <MissingRequirementsBar
            issues={attempted ? missingIssues : []}
            attempted={attempted}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {t("common.create")}
          </Button>
        </div>
      </form>
    </SafeFormDialog>
  );
}

interface FieldBlockProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  dir?: "ltr" | "rtl";
  hint?: string;
  type?: string;
}
function FieldBlock({ label, value, onChange, required, dir, hint, type }: FieldBlockProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </Label>
      <Input
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
