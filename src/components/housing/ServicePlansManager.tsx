import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useStableServicePlans, type StableServicePlan, type CreatePlanData } from "@/hooks/housing/useStableServicePlans";
import { useServices } from "@/hooks/useServices";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { displayServiceName } from "@/lib/displayHelpers";
import { normalizeIncludes, type IncludedServiceEntry } from "@/lib/planIncludes";
import { PlanIncludedServicesPicker } from "./PlanIncludedServicesPicker";
import { PlanIncludedServicesDisplay } from "./PlanIncludedServicesDisplay";
import { Plus, Pencil, Package, Trash2, Link2 } from "lucide-react";

export function ServicePlansManager() {
  const { t, lang } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canManagePlans = isOwner || hasPermission('boarding.admission.update');
  const { plans, isLoading, createPlan, isCreating, updatePlan, deletePlan } = useStableServicePlans();
  const { data: services = [] } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StableServicePlan | null>(null);
  const [includedServices, setIncludedServices] = useState<IncludedServiceEntry[]>([]);
  const [form, setForm] = useState<CreatePlanData>({
    name: '', name_ar: '', description: '', service_id: null, plan_type: 'boarding',
    billing_cycle: 'monthly', base_price: 0, currency: 'SAR',
    is_active: true, is_public: false,
  });

  const openCreate = () => {
    setEditing(null);
    setIncludedServices([]);
    setForm({ name: '', name_ar: '', description: '', service_id: null, plan_type: 'boarding', billing_cycle: 'monthly', base_price: 0, currency: 'SAR', is_active: true, is_public: false });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('housing.plans.title')}</h2>
        {canManagePlans && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t('housing.plans.addPlan')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('housing.plans.empty')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
              <Plus className="h-4 w-4 me-1" />
              {t('housing.plans.createFirst')}
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
                  <Badge variant="outline">{t(`housing.plans.types.${plan.plan_type}` as any) || plan.plan_type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('housing.plans.editPlan') : t('housing.plans.addPlan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('housing.plans.name')} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t('housing.plans.nameAr')}</Label>
              <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} dir="rtl" />
            </div>
            <div>
              <Label>{t('housing.plans.parentService')}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t('services.parentServiceHint')}</p>
              <Select value={form.service_id || '_none'} onValueChange={v => setForm(f => ({ ...f, service_id: v === '_none' ? null : v }))}>
                <SelectTrigger><SelectValue placeholder={t('housing.plans.noParentService')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('housing.plans.noParentService')}</SelectItem>
                  {services.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {displayServiceName(s.name, s.name_ar, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('housing.plans.description')}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('housing.plans.basePrice')}</Label>
                <Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>{t('housing.plans.currency')}</Label>
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
                <Label>{t('housing.plans.billingCycle')}</Label>
                <Select value={form.billing_cycle} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('housing.admissions.wizard.cycleDaily')}</SelectItem>
                    <SelectItem value="weekly">{t('housing.admissions.wizard.cycleWeekly')}</SelectItem>
                    <SelectItem value="monthly">{t('housing.admissions.wizard.cycleMonthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('housing.plans.planType')}</Label>
                <Select value={form.plan_type} onValueChange={v => setForm(f => ({ ...f, plan_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boarding">{t('housing.plans.types.boarding')}</SelectItem>
                    <SelectItem value="training">{t('housing.plans.types.training')}</SelectItem>
                    <SelectItem value="medical">{t('housing.plans.types.medical')}</SelectItem>
                    <SelectItem value="premium">{t('housing.plans.types.premium')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>{t('common.active')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_public} onCheckedChange={v => setForm(f => ({ ...f, is_public: v }))} />
                <Label>{t('housing.plans.public')}</Label>
              </div>
            </div>
            <PlanIncludedServicesPicker value={includedServices} onChange={setIncludedServices} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.name.trim()}>
              {isCreating ? t('common.loading') : editing ? t('common.save') : t('housing.plans.addPlan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
