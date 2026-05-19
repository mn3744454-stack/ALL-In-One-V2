import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import {
  useStableServicePlans, type StableServicePlan, type CreatePlanData,
} from "@/hooks/useStableServicePlans";
import { useServices } from "@/hooks/useServices";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useI18n } from "@/i18n";
import { displayServiceName } from "@/lib/displayHelpers";
import { normalizeIncludes, type IncludedServiceEntry } from "@/lib/planIncludes";
import { PlanIncludedServicesPicker } from "./PlanIncludedServicesPicker";
import { PlanIncludedServicesDisplay } from "./PlanIncludedServicesDisplay";
import { Plus, Pencil, Package, Link2 } from "lucide-react";

type PlanFormValues = {
  name: string;
  name_ar?: string;
  description?: string;
  service_id?: string | null;
  plan_type: string;
  billing_cycle: string;
  base_price: number;
  currency: string;
  is_active: boolean;
  is_public: boolean;
};

export function ServicePlansManager() {
  const { t, lang } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canManagePlans = isOwner || hasPermission('services.manage');
  const tenantCurrency = useTenantCurrency();
  const { plans, isLoading, createPlan, isCreating, updatePlan } = useStableServicePlans();
  const { data: services = [] } = useServices();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('services-packages');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StableServicePlan | null>(null);
  const [includedServices, setIncludedServices] = useState<IncludedServiceEntry[]>([]);
  const [initialIncludesKey, setInitialIncludesKey] = useState<string>("[]");

  const planSchema = useMemo(() => {
    const isArabicUI = lang === 'ar';
    return z.object({
      name: z.string().min(2, t('services.packages.validation.nameMin')),
      name_ar: isArabicUI
        ? z.string().min(2, t('services.packages.validation.nameArRequired'))
        : z.string().optional(),
      description: z.string().optional(),
      service_id: z.string().nullable().optional(),
      plan_type: z.string().min(1, t('services.packages.validation.typeRequired')),
      billing_cycle: z.string().min(1, t('services.packages.validation.cycleRequired')),
      base_price: z.coerce.number().min(0, t('services.packages.validation.priceNonNegative')),
      currency: z.string().min(1),
      is_active: z.boolean().default(true),
      is_public: z.boolean().default(false),
    });
  }, [t, lang]);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '', name_ar: '', description: '', service_id: null,
      plan_type: '', billing_cycle: '', base_price: 0, currency: tenantCurrency,
      is_active: true, is_public: false,
    },
  });

  // Dirty tracking: RHF dirty OR includedServices changed from initial snapshot.
  const includesKey = JSON.stringify(includedServices);
  const isDirty = (form.formState.isDirty || includesKey !== initialIncludesKey) && !form.formState.isSubmitting;

  const openCreate = () => {
    setEditing(null);
    setIncludedServices([]);
    setInitialIncludesKey('[]');
    form.reset({
      name: '', name_ar: '', description: '', service_id: null,
      plan_type: '', billing_cycle: '', base_price: 0, currency: tenantCurrency,
      is_active: true, is_public: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (plan: StableServicePlan) => {
    setEditing(plan);
    const includes = normalizeIncludes(plan.includes);
    setIncludedServices(includes);
    setInitialIncludesKey(JSON.stringify(includes));
    form.reset({
      name: plan.name,
      name_ar: plan.name_ar || '',
      description: plan.description || '',
      service_id: plan.service_id || null,
      plan_type: plan.plan_type,
      billing_cycle: plan.billing_cycle,
      base_price: plan.base_price,
      currency: plan.currency,
      is_active: plan.is_active,
      is_public: plan.is_public,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: PlanFormValues) => {
    const payload: CreatePlanData = {
      ...values,
      includes: includedServices as unknown as Record<string, unknown>,
    };
    if (editing) {
      await updatePlan({ id: editing.id, ...payload });
    } else {
      await createPlan(payload);
    }
    // Clear dirty state so SafeFormDialog skips discard confirm.
    form.reset(values);
    setInitialIncludesKey(JSON.stringify(includedServices));
    setDialogOpen(false);
  };

  const activeCount = plans.filter(p => p.is_active).length;
  const publicCount = plans.filter(p => p.is_public).length;

  const parentServiceLabel = (plan: StableServicePlan) => {
    if (!plan.service_id) return null;
    const s = services.find(x => x.id === plan.service_id);
    return s ? displayServiceName(s.name, s.name_ar, lang) : null;
  };

  const renderActions = (plan: StableServicePlan) => (
    canManagePlans ? (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    ) : null
  );

  const renderCard = (plan: StableServicePlan) => (
    <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium">{displayServiceName(plan.name, plan.name_ar, lang)}</h3>
          <div className="flex items-center gap-1">
            {!plan.is_active && <Badge variant="secondary">{t('common.inactive')}</Badge>}
            {renderActions(plan)}
          </div>
        </div>
        {plan.description && <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>}
        <PlanIncludedServicesDisplay includes={plan.includes} compact />
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {parentServiceLabel(plan) && (
            <Badge variant="default" className="text-xs gap-1">
              <Link2 className="h-3 w-3" />
              {parentServiceLabel(plan)}
            </Badge>
          )}
          <Badge variant="outline">{plan.base_price} {plan.currency}</Badge>
          <Badge variant="outline">{t(`services.billingCycles.${plan.billing_cycle}` as any) || plan.billing_cycle}</Badge>
          <Badge variant="outline">{t(`services.packages.types.${plan.plan_type}` as any) || plan.plan_type}</Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="elevated"><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold text-navy">{plans.length}</p><p className="text-xs text-muted-foreground">{t('common.total')}</p></CardContent></Card>
        <Card variant="elevated"><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold text-navy">{activeCount}</p><p className="text-xs text-muted-foreground">{t('common.active')}</p></CardContent></Card>
        <Card variant="elevated"><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold text-navy">{publicCount}</p><p className="text-xs text-muted-foreground">{t('services.public')}</p></CardContent></Card>
        <Card variant="elevated"><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold text-navy">{plans.length - publicCount}</p><p className="text-xs text-muted-foreground">{t('services.private')}</p></CardContent></Card>
      </div>

      {/* Header + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('services.packages.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('services.packages.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
          {canManagePlans && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 me-1" />
              {t('services.packages.addPackage')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('services.packages.empty')}</p>
            {canManagePlans && (
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 me-1" />
                {t('services.packages.createFirst')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('services.packages.table.name')}</TableHead>
                <TableHead>{t('services.packages.table.parentService')}</TableHead>
                <TableHead>{t('services.packages.table.type')}</TableHead>
                <TableHead>{t('services.packages.table.billingCycle')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('services.packages.table.price')}</TableHead>
                <TableHead>{t('services.packages.table.included')}</TableHead>
                <TableHead>{t('services.packages.table.public')}</TableHead>
                <TableHead>{t('services.packages.table.active')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => {
                const parent = parentServiceLabel(plan);
                const includedCount = normalizeIncludes(plan.includes).length;
                return (
                  <TableRow key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                    <TableCell>{displayServiceName(plan.name, plan.name_ar, lang)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{parent || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t(`services.packages.types.${plan.plan_type}` as any) || plan.plan_type || '—'}</Badge></TableCell>
                    <TableCell className="text-sm">{t(`services.billingCycles.${plan.billing_cycle}` as any) || plan.billing_cycle || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{plan.base_price} {plan.currency}</TableCell>
                    <TableCell>{includedCount}</TableCell>
                    <TableCell>
                      <Badge variant={plan.is_public ? 'default' : 'secondary'} className="text-xs">
                        {plan.is_public ? t('common.yes') : t('common.no')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                        {plan.is_active ? t('common.yes') : t('common.no')}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[60px]">{renderActions(plan)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {plans.map(renderCard)}
        </div>
      )}

      {/* Add/Edit Package — safe dialog */}
      <SafeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isDirty={isDirty}
        className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0"
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{editing ? t('services.packages.editPackage') : t('services.packages.addPackage')}</DialogTitle>
          <DialogDescription>{t('services.packages.dialogDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-5">
              {/* Identity */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionIdentity')}</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('services.packages.name')} *</FormLabel>
                      <FormControl><Input placeholder={t('services.packages.namePlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name_ar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('services.packages.nameAr')}{lang === 'ar' ? ' *' : ''}</FormLabel>
                      <FormControl><Input dir="rtl" placeholder={t('services.packages.nameArPlaceholder')} {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('services.packages.description')}</FormLabel>
                      <FormControl><Textarea rows={2} placeholder={t('services.packages.descPlaceholder')} {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="service_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('services.packages.parentService')}</FormLabel>
                      <p className="text-xs text-muted-foreground mb-1">{t('services.parentServiceHint')}</p>
                      <Select value={field.value || '_none'} onValueChange={v => field.onChange(v === '_none' ? null : v)}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t('services.packages.noParentService')} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="_none">{t('services.packages.noParentService')}</SelectItem>
                          {services.filter(s => s.is_active).map(s => (
                            <SelectItem key={s.id} value={s.id}>{displayServiceName(s.name, s.name_ar, lang)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              {/* Pricing & Structure */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionPricing')}</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="base_price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('services.packages.basePrice')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" value={field.value ?? 0}
                            onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('services.packages.currency')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="billing_cycle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('services.packages.billingCycle')} *</FormLabel>
                        <Select value={field.value || '_none'} onValueChange={v => field.onChange(v === '_none' ? '' : v)}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t('services.packages.selectCycle')} /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="_none">{t('services.packages.noCycleSelected')}</SelectItem>
                            <SelectItem value="daily">{t('services.billingCycles.daily')}</SelectItem>
                            <SelectItem value="weekly">{t('services.billingCycles.weekly')}</SelectItem>
                            <SelectItem value="monthly">{t('services.billingCycles.monthly')}</SelectItem>
                            <SelectItem value="yearly">{t('services.billingCycles.yearly')}</SelectItem>
                            <SelectItem value="one-time">{t('services.billingCycles.oneTime')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="plan_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('services.packages.packageType')} *</FormLabel>
                        <Select value={field.value || '_none'} onValueChange={v => field.onChange(v === '_none' ? '' : v)}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t('services.packages.selectType')} /></SelectTrigger></FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex items-center gap-6 pt-1">
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="text-sm !mt-0">{t('common.active')}</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="is_public" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="text-sm !mt-0">{t('services.packages.public')}</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Composition */}
              <div className="pb-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">{t('services.packages.sectionComposition')}</p>
                <PlanIncludedServicesPicker value={includedServices} onChange={setIncludedServices} />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating || form.formState.isSubmitting}>
                {isCreating ? t('common.loading') : editing ? t('common.save') : t('services.packages.addPackage')}
              </Button>
            </div>
          </form>
        </Form>
      </SafeFormDialog>
    </div>
  );
}
