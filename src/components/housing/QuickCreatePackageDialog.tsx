import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import { useI18n } from "@/i18n";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useStableServicePlans, type StableServicePlan } from "@/hooks/useStableServicePlans";
import { Loader2, Package } from "lucide-react";

interface QuickCreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (plan: StableServicePlan) => void;
}

const PLAN_TYPES = ['boarding', 'training', 'medical', 'premium', 'wellness', 'commercial'] as const;
const BILLING_CYCLES = [
  { value: 'daily', key: 'cycleDaily' },
  { value: 'weekly', key: 'cycleWeekly' },
  { value: 'monthly', key: 'cycleMonthly' },
  { value: 'yearly', key: 'cycleYearly' },
  { value: 'one-time', key: 'cycleOnetime' },
] as const;

export function QuickCreatePackageDialog({ open, onOpenChange, onCreated }: QuickCreatePackageDialogProps) {
  const { t } = useI18n();
  const tenantCurrency = useTenantCurrency();
  const { createPlan, isCreating } = useStableServicePlans();

  const initial = useMemo(
    () => ({
      name: "",
      name_ar: "",
      plan_type: "",
      billing_cycle: "",
      base_price: "",
      currency: tenantCurrency,
    }),
    [tenantCurrency],
  );

  const [form, setForm] = useState(initial);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { isDirty, resetBaseline } = useDirtyForm(form, open);

  const priceValue = form.base_price === "" ? null : parseFloat(form.base_price);
  const priceValid =
    form.base_price === "" || (priceValue !== null && !Number.isNaN(priceValue) && priceValue >= 0);

  const nameValid = form.name.trim().length > 0;
  const typeValid = !!form.plan_type;
  const cycleValid = !!form.billing_cycle;

  const missingIssues = useMemo<string[]>(() => {
    const out: string[] = [];
    if (!nameValid) out.push(t("housing.quickCreate.missing.name"));
    if (!typeValid) out.push(t("housing.quickCreate.missing.planType"));
    if (!cycleValid) out.push(t("housing.quickCreate.missing.billingCycle"));
    if (!priceValid) out.push(t("housing.quickCreate.missing.price"));
    return out;
  }, [nameValid, typeValid, cycleValid, priceValid, t]);

  const canSubmit = nameValid && typeValid && cycleValid && priceValid;
  const effectiveIsDirty = isDirty && !isCreating;

  const resetForm = () => setForm(initial);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!canSubmit) return;
    try {
      const result = await createPlan({
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        plan_type: form.plan_type,
        billing_cycle: form.billing_cycle,
        base_price: priceValue ?? 0,
        currency: form.currency,
        is_active: true,
      });
      // Clear dirty BEFORE controlled close to skip discard confirmation.
      resetBaseline(form);
      onCreated(result as StableServicePlan);
      onOpenChange(false);
      resetForm();
      setAttemptedSubmit(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={effectiveIsDirty}
      className="sm:max-w-lg"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {t('housing.quickCreate.addNewPackage')}
        </DialogTitle>
        <DialogDescription>
          {t('housing.quickCreate.packageDesc')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div>
          <Label>{t('services.packages.name')} *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('services.packages.namePlaceholder')}
            dir="ltr"
            aria-invalid={attemptedSubmit && !nameValid}
          />
        </div>

        <div>
          <Label>{t('services.packages.nameAr')}</Label>
          <Input
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            placeholder={t('services.packages.nameArPlaceholder')}
            dir="rtl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('services.packages.packageType')} *</Label>
            <Select
              value={form.plan_type || '_none'}
              onValueChange={(v) => setForm((f) => ({ ...f, plan_type: v === '_none' ? '' : v }))}
            >
              <SelectTrigger aria-invalid={attemptedSubmit && !typeValid}>
                <SelectValue placeholder={t('services.packages.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t('services.packages.noTypeSelected')}</SelectItem>
                {PLAN_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`services.packages.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('services.packages.billingCycle')} *</Label>
            <Select
              value={form.billing_cycle || '_none'}
              onValueChange={(v) => setForm((f) => ({ ...f, billing_cycle: v === '_none' ? '' : v }))}
            >
              <SelectTrigger aria-invalid={attemptedSubmit && !cycleValid}>
                <SelectValue placeholder={t('services.packages.selectCycle')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t('services.packages.noCycleSelected')}</SelectItem>
                {BILLING_CYCLES.map((cycle) => (
                  <SelectItem key={cycle.value} value={cycle.value}>
                    {t(`housing.admissions.wizard.${cycle.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('services.packages.basePrice')}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.base_price}
              onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
              placeholder="0.00"
              aria-invalid={attemptedSubmit && !priceValid}
            />
          </div>

          <div>
            <Label>{t('services.packages.currency')}</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <MissingRequirementsBar
        issues={attemptedSubmit ? missingIssues : []}
        attempted={attemptedSubmit}
        className="mt-1"
      />

      <div className="flex justify-end gap-2 pt-3 border-t mt-3">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={isCreating}>
          {isCreating && <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1" />}
          {t('common.save')}
        </Button>
      </div>
    </SafeFormDialog>
  );
}
