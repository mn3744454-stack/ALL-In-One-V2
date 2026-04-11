import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTenant } from "@/contexts/TenantContext";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useStableServicePlans, type StableServicePlan } from "@/hooks/useStableServicePlans";
import { Loader2, Package } from "lucide-react";

interface QuickCreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (plan: StableServicePlan) => void;
}

const PLAN_TYPES = ['boarding', 'training', 'medical', 'premium', 'wellness', 'commercial'] as const;
const BILLING_CYCLES = ['daily', 'weekly', 'monthly', 'yearly', 'one-time'] as const;

export function QuickCreatePackageDialog({ open, onOpenChange, onCreated }: QuickCreatePackageDialogProps) {
  const { t } = useI18n();
  const tenantCurrency = useTenantCurrency();
  const { createPlan, isCreating } = useStableServicePlans();

  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    plan_type: "",
    billing_cycle: "",
    base_price: "",
    currency: tenantCurrency,
  });

  const canSubmit = form.name.trim() && form.plan_type && form.billing_cycle;

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      name_ar: "",
      plan_type: "",
      billing_cycle: "",
      base_price: "",
      currency: tenantCurrency,
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const result = await createPlan({
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        plan_type: form.plan_type,
        billing_cycle: form.billing_cycle,
        base_price: form.base_price ? parseFloat(form.base_price) : 0,
        currency: form.currency,
        is_active: true,
      });
      onCreated(result as StableServicePlan);
      onOpenChange(false);
      resetForm();
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
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
          {/* Package Name EN */}
          <div>
            <Label>{t('services.packages.name')} *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('services.packages.namePlaceholder')}
              dir="ltr"
            />
          </div>

          {/* Package Name AR */}
          <div>
            <Label>{t('services.packages.nameAr')}</Label>
            <Input
              value={form.name_ar}
              onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
              placeholder={t('services.packages.nameArPlaceholder')}
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Package Type */}
            <div>
              <Label>{t('services.packages.packageType')} *</Label>
              <Select value={form.plan_type || '_none'} onValueChange={v => setForm(f => ({ ...f, plan_type: v === '_none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('services.packages.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('services.packages.noTypeSelected')}</SelectItem>
                  {PLAN_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`services.packages.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Cycle */}
            <div>
              <Label>{t('services.packages.billingCycle')} *</Label>
              <Select value={form.billing_cycle || '_none'} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v === '_none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('services.packages.selectCycle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('services.packages.noCycleSelected')}</SelectItem>
                  {BILLING_CYCLES.map(cycle => (
                    <SelectItem key={cycle} value={cycle}>
                      {t(`housing.admissions.wizard.cycle${cycle.charAt(0).toUpperCase() + cycle.slice(1).replace('-', '')}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Base Price */}
            <div>
              <Label>{t('services.packages.basePrice')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Currency */}
            <div>
              <Label>{t('services.packages.currency')}</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 animate-spin ltr:mr-1 rtl:ml-1" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
