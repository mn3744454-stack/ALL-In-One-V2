import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useStableServicePlans, type StableServicePlan, type CreatePlanData } from "@/hooks/useStableServicePlans";
import { useServices } from "@/hooks/useServices";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useI18n } from "@/i18n";
import { displayServiceName } from "@/lib/displayHelpers";
import { normalizeIncludes, type IncludedServiceEntry } from "@/lib/planIncludes";
import { PlanIncludedServicesPicker } from "./PlanIncludedServicesPicker";
import { PlanIncludedServicesDisplay } from "./PlanIncludedServicesDisplay";
import { Plus, Pencil, Package, Link2, Layers, BarChart3 } from "lucide-react";

export function ServicePlansManager() {
  const { t, lang } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canManagePlans = isOwner || hasPermission('services.manage');
  const tenantCurrency = useTenantCurrency();
  const { plans, isLoading, createPlan, isCreating, updatePlan, deletePlan } = useStableServicePlans();
  const { data: services = [] } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StableServicePlan | null>(null);
  const [includedServices, setIncludedServices] = useState<IncludedServiceEntry[]>([]);
  const [form, setForm] = useState<CreatePlanData>({
    name: '', name_ar: '', description: '', service_id: null, plan_type: '',
    billing_cycle: '', base_price: 0, currency: tenantCurrency,
    is_active: true, is_public: false,
  });

  const openCreate = () => {
    setEditing(null);
    setIncludedServices([]);
    setForm({ name: '', name_ar: '', description: '', service_id: null, plan_type: '', billing_cycle: '', base_price: 0, currency: tenantCurrency, is_active: true, is_public: false });
    setDialogOpen(true);
  };

  const openEdit = (plan: StableServicePlan) => {
    setEditing(plan);
    setIncludedServices(normalizeIncludes(plan.includes));
    setForm({
      name: plan.name, name_ar: plan.name_ar || '', description: plan.description || '',
      service_id: plan.service_id || null,
      plan_type: plan.plan_type, billing_cycle: plan.billing_cycle,
      base_price: plan.base_price, currency: plan.currency,
      is_active: plan.is_active, is_public: plan.is_public,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, includes: includedServices };
    if (editing) {
      await updatePlan({ id: editing.id, ...payload });
    } else {
      await createPlan(payload);
    }
    setDialogOpen(false);
  };

  const activeCount = plans.filter(p => p.is_active).length;
  const publicCount = plans.filter(p => p.is_public).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-navy">{plans.length}</p>
            <p className="text-xs text-muted-foreground">{t('common.total')}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-navy">{activeCount}</p>
            <p className="text-xs text-muted-foreground">{t('common.active')}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-navy">{publicCount}</p>
            <p className="text-xs text-muted-foreground">{t('services.public')}</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-display font-bold text-navy">{plans.length - publicCount}</p>
            <p className="text-xs text-muted-foreground">{t('services.private')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('services.packages.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('services.packages.subtitle')}</p>
        </div>
        {canManagePlans && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t('services.packages.addPackage')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('services.packages.empty')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
              <Plus className="h-4 w-4 me-1" />
              {t('services.packages.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map(plan => (
            <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{displayServiceName(plan.name, plan.name_ar, lang)}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {!plan.is_active && <Badge variant="secondary">{t('common.inactive')}</Badge>}
                    {canManagePlans && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {plan.description && <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>}
                <PlanIncludedServicesDisplay includes={plan.includes} compact />
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {plan.service_id && (() => {
                    const parentService = services.find(s => s.id === plan.service_id);
                    return parentService ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <Link2 className="h-3 w-3" />
                        {displayServiceName(parentService.name, parentService.name_ar, lang)}
                      </Badge>
                    ) : null;
                  })()}
                  <Badge variant="outline">{plan.base_price} {plan.currency}</Badge>
                  <Badge variant="outline">{t(`services.billingCycles.${plan.billing_cycle}` as any) || plan.billing_cycle}</Badge>
                  <Badge variant="outline">{t(`services.packages.types.${plan.plan_type}` as any) || plan.plan_type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>{editing ? t('services.packages.editPackage') : t('services.packages.addPackage')}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t('services.packages.dialogDesc')}</p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-5">
            {/* Section: Package Identity */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionIdentity')}</p>
              <div className="space-y-3">
                <div>
                  <Label>{t('services.packages.name')} *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('services.packages.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('services.packages.nameAr')}</Label>
                  <Input
                    value={form.name_ar}
                    onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                    dir="rtl"
                    placeholder={t('services.packages.nameArPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('services.packages.description')}</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder={t('services.packages.descPlaceholder')} />
                </div>
                <div>
                  <Label>{t('services.packages.parentService')}</Label>
                  <p className="text-xs text-muted-foreground mb-1">{t('services.parentServiceHint')}</p>
                  <Select value={form.service_id || '_none'} onValueChange={v => setForm(f => ({ ...f, service_id: v === '_none' ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder={t('services.packages.noParentService')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t('services.packages.noParentService')}</SelectItem>
                      {services.filter(s => s.is_active).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {displayServiceName(s.name, s.name_ar, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Pricing & Structure */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionPricing')}</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('services.packages.basePrice')}</Label>
                    <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>{t('services.packages.currency')}</Label>
                    <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t('services.packages.billingCycle')}</Label>
                    <Select value={form.billing_cycle || '_none'} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v === '_none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={t('services.packages.selectCycle')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t('services.packages.noCycleSelected')}</SelectItem>
                        <SelectItem value="daily">{t('services.billingCycles.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('services.billingCycles.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('services.billingCycles.monthly')}</SelectItem>
                        <SelectItem value="yearly">{t('services.billingCycles.yearly')}</SelectItem>
                        <SelectItem value="one-time">{t('services.billingCycles.oneTime')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('services.packages.packageType')}</Label>
                    <Select value={form.plan_type || '_none'} onValueChange={v => setForm(f => ({ ...f, plan_type: v === '_none' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder={t('services.packages.selectType')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{t('services.packages.noTypeSelected')}</SelectItem>
                        <SelectItem value="boarding">{t('services.packages.types.boarding')}</SelectItem>
                        <SelectItem value="training">{t('services.packages.types.training')}</SelectItem>
                        <SelectItem value="medical">{t('services.packages.types.medical')}</SelectItem>
                        <SelectItem value="premium">{t('services.packages.types.premium')}</SelectItem>
                        <SelectItem value="wellness">{t('services.packages.types.wellness')}</SelectItem>
                        <SelectItem value="commercial">{t('services.packages.types.commercial')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-6 pt-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                    <Label className="text-sm">{t('common.active')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_public} onCheckedChange={v => setForm(f => ({ ...f, is_public: v }))} />
                    <Label className="text-sm">{t('services.packages.public')}</Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Included Services */}
            <div className="pb-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionComposition')}</p>
              <PlanIncludedServicesPicker value={includedServices} onChange={setIncludedServices} />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.name.trim() || !form.plan_type || !form.billing_cycle}>
              {isCreating ? t('common.loading') : editing ? t('common.save') : t('services.packages.addPackage')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
