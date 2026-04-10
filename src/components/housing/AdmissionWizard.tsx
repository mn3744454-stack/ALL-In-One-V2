import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { displayClientName } from "@/lib/displayHelpers";
import { BilingualName } from "@/components/ui/BilingualName";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useBoardingAdmissions, type CreateAdmissionData } from "@/hooks/housing/useBoardingAdmissions";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useStableServicePlans } from "@/hooks/housing/useStableServicePlans";
import { displayServiceName } from "@/lib/displayHelpers";
import { PlanIncludedServicesDisplay } from "./PlanIncludedServicesDisplay";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Heart, User, Building2, DoorOpen, CreditCard, FileText, Package, Plus } from "lucide-react";
import { QuickCreateHorseDialog } from "./QuickCreateHorseDialog";

interface AdmissionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Pre-select a horse (e.g. from incoming arrival confirmation) */
  preselectedHorseId?: string;
  /** Pre-fill and lock housing context when launched from unit drawer */
  preselectedBranchId?: string;
  preselectedAreaId?: string;
  preselectedUnitId?: string;
}

const STEPS = ['horse', 'client', 'plan', 'housing', 'rates', 'details', 'review'] as const;
type Step = typeof STEPS[number];

export function AdmissionWizard({ open, onOpenChange, onSuccess, preselectedHorseId, preselectedBranchId, preselectedAreaId, preselectedUnitId }: AdmissionWizardProps) {
  const { t, dir, lang } = useI18n();
  const isMobile = useIsMobile();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const [step, setStep] = useState<Step>('horse');
  const [form, setForm] = useState({
    horseId: '' as string,
    clientId: '' as string,
    branchId: '' as string,
    areaId: '' as string,
    unitId: '' as string,
    planId: '' as string,
    dailyRate: '' as string,
    monthlyRate: '' as string,
    billingCycle: 'monthly',
    rateCurrency: 'SAR',
    reason: '',
    specialInstructions: '',
    emergencyContact: '',
    expectedDeparture: '',
    arrivalDate: '' as string,
  });

  const { horses } = useHorses();
  const { createAdmission, isCreating } = useBoardingAdmissions();
  const { areas } = useFacilityAreas();
  const { units } = useHousingUnits();
  const { activePlans } = useStableServicePlans();
  const [clients, setClients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Load clients/branches when dialog opens
  useEffect(() => {
    if (!open || !tenantId) return;
    supabase.from('clients').select('id, name, name_ar, phone').eq('tenant_id', tenantId).eq('status', 'active').then(({ data }) => {
      setClients(data || []);
    });
    supabase.from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).then(({ data }) => {
      setBranches(data || []);
    });
  }, [open, tenantId]);

  // Pre-fill from unit-side context (Scenario A) or incoming arrival flow
  useEffect(() => {
    if (!open) return;
    setForm(f => ({
      ...f,
      horseId: preselectedHorseId || f.horseId,
      branchId: preselectedBranchId || f.branchId,
      areaId: preselectedAreaId || f.areaId,
      unitId: preselectedUnitId || f.unitId,
    }));
    // If unit-side context is fully provided, skip to client step
    if (preselectedHorseId && preselectedBranchId) {
      setStep('client');
    }
  }, [open, preselectedHorseId, preselectedBranchId, preselectedAreaId, preselectedUnitId]);

  const selectedHorse = horses.find(h => h.id === form.horseId);
  const selectedClient = clients.find((c: any) => c.id === form.clientId);
  const selectedPlan = activePlans.find(p => p.id === form.planId);
  const filteredAreas = areas.filter(a => a.branch_id === form.branchId);
  const filteredUnits = units.filter(u => {
    if (form.areaId) return u.area_id === form.areaId;
    return u.branch_id === form.branchId;
  });

  // When plan is selected, prefill rate fields
  const handlePlanSelect = (planId: string) => {
    setForm(f => {
      if (planId === '__none__') {
        return { ...f, planId: '' };
      }
      const plan = activePlans.find(p => p.id === planId);
      if (!plan) return { ...f, planId: '' };
      return {
        ...f,
        planId,
        billingCycle: plan.billing_cycle,
        rateCurrency: plan.currency,
        monthlyRate: plan.billing_cycle === 'monthly' ? String(plan.base_price) : f.monthlyRate,
        dailyRate: plan.billing_cycle === 'daily' ? String(plan.base_price) : f.dailyRate,
      };
    });
  };

  const stepIndex = STEPS.indexOf(step);
  const canGoNext = () => {
    switch (step) {
      case 'horse': return !!form.horseId;
      case 'client': return true;
      case 'housing': return !!form.branchId;
      case 'plan': return true;
      case 'rates': return true;
      case 'details': return true;
      case 'review': return true;
      default: return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleSubmit = async () => {
    if (!form.horseId || !form.branchId) return;

    try {
      const data: CreateAdmissionData = {
        horse_id: form.horseId,
        client_id: form.clientId || null,
        branch_id: form.branchId,
        area_id: form.areaId || null,
        unit_id: form.unitId || null,
        plan_id: form.planId || null,
        daily_rate: form.dailyRate ? parseFloat(form.dailyRate) : null,
        monthly_rate: form.monthlyRate ? parseFloat(form.monthlyRate) : null,
        billing_cycle: form.billingCycle,
        rate_currency: form.rateCurrency,
        reason: form.reason || undefined,
        special_instructions: form.specialInstructions || undefined,
        emergency_contact: form.emergencyContact || undefined,
        expected_departure: form.expectedDeparture || null,
        admitted_at: form.arrivalDate || undefined,
      };

      await createAdmission(data);

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled in mutation
    }
  };

  const resetForm = () => {
    setStep('horse');
    setForm({
      horseId: '', clientId: '', branchId: '', areaId: '', unitId: '', planId: '',
      dailyRate: '', monthlyRate: '', billingCycle: 'monthly', rateCurrency: 'SAR',
      reason: '', specialInstructions: '', emergencyContact: '', expectedDeparture: '',
      arrivalDate: '',
    });
  };

  const stepLabels: Record<Step, string> = {
    horse: t('housing.admissions.wizard.stepHorse'),
    client: t('housing.admissions.wizard.stepClient'),
    housing: t('housing.admissions.wizard.stepHousing'),
    plan: t('housing.plans.title'),
    rates: t('housing.admissions.wizard.stepRates'),
    details: t('housing.admissions.wizard.stepDetails'),
    review: t('housing.admissions.wizard.stepReview'),
  };

  const renderStep = () => {
    switch (step) {
      case 'horse':
        return (
          <div className="space-y-3">
            <Label>{t('housing.admissions.wizard.selectHorse')} *</Label>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {horses.filter(h => h.status === 'active').map(horse => (
                <button
                  key={horse.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, horseId: horse.id }))}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-start transition-all",
                    form.horseId === horse.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={horse.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {horse.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <BilingualName name={horse.name} nameAr={horse.name_ar} primaryClassName="text-sm" />
                  </div>
                  {form.horseId === horse.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'client':
        return (
          <div className="space-y-3">
            <Label>{t('housing.admissions.wizard.selectClient')}</Label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, clientId: '' }))}
              className={cn(
                "w-full p-3 rounded-lg border text-start",
                !form.clientId ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <span className="text-sm text-muted-foreground">{t('housing.admissions.wizard.noClient')}</span>
            </button>
            <div className="grid gap-2 max-h-56 overflow-y-auto">
              {clients.map((client: any) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, clientId: client.id }))}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-start",
                    form.clientId === client.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                  )}
                >
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <BilingualName name={client.name} nameAr={client.name_ar} primaryClassName="text-sm" />
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                  </div>
                  {form.clientId === client.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'housing': {
        const isLocked = !!preselectedBranchId;
        return (
          <div className="space-y-4">
            {isLocked && (
              <div className="text-xs text-muted-foreground p-2 rounded bg-muted/50">
                {t('housing.admissions.wizard.housingPrefilled')}
              </div>
            )}
            <div>
              <Label>{t('housing.admissions.wizard.branch')} *</Label>
              <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v, areaId: '', unitId: '' }))} disabled={isLocked}>
                <SelectTrigger><SelectValue placeholder={t('housing.admissions.wizard.selectBranch')} /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.branchId && filteredAreas.length > 0 && (
              <div>
                <Label>{t('housing.admissions.wizard.area')}</Label>
                <Select value={form.areaId} onValueChange={v => setForm(f => ({ ...f, areaId: v, unitId: '' }))} disabled={isLocked && !!preselectedAreaId}>
                  <SelectTrigger><SelectValue placeholder={t('housing.admissions.wizard.selectArea')} /></SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.branchId && filteredUnits.length > 0 && (
              <div>
                <Label>{t('housing.admissions.wizard.unit')}</Label>
                <Select value={form.unitId} onValueChange={v => setForm(f => ({ ...f, unitId: v }))} disabled={isLocked && !!preselectedUnitId}>
                  <SelectTrigger><SelectValue placeholder={t('housing.admissions.wizard.selectUnit')} /></SelectTrigger>
                  <SelectContent>
                    {filteredUnits.filter(u => u.is_active).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.code}{u.name ? ` - ${u.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      }
      case 'plan':
        return (
          <div className="space-y-3">
            <Label>{t('housing.plans.selectPlan')}</Label>
            {/* No plan option */}
            <button
              type="button"
              onClick={() => handlePlanSelect('__none__')}
              className={cn(
                "w-full p-3 rounded-lg border text-start",
                !form.planId ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <span className="text-sm text-muted-foreground">{t('housing.plans.noPlan')}</span>
            </button>
            <div className="grid gap-2 max-h-56 overflow-y-auto">
              {activePlans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-start",
                    form.planId === plan.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                  )}
                >
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <BilingualName name={plan.name} nameAr={plan.name_ar} primaryClassName="text-sm" />
                    <PlanIncludedServicesDisplay includes={plan.includes} compact />
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{plan.base_price} {plan.currency}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{plan.billing_cycle}</Badge>
                    </div>
                  </div>
                  {form.planId === plan.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))}
              {activePlans.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">{t('housing.plans.empty')}</p>
              )}
            </div>
          </div>
        );
      case 'rates':
        return (
          <div className="space-y-4">
            {selectedPlan && (
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                {t('housing.plans.title')}: <span className="font-medium text-foreground">{selectedPlan ? displayServiceName(selectedPlan.name, selectedPlan.name_ar, lang) : ''}</span>
                <span className="ms-auto text-xs">{t('housing.admissions.wizard.overrideHint')}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('housing.admissions.wizard.dailyRate')}</Label>
                <Input
                  type="number"
                  value={form.dailyRate}
                  onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>{t('housing.admissions.wizard.monthlyRate')}</Label>
                <Input
                  type="number"
                  value={form.monthlyRate}
                  onChange={e => setForm(f => ({ ...f, monthlyRate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('housing.admissions.wizard.billingCycle')}</Label>
                <Select value={form.billingCycle} onValueChange={v => setForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('housing.admissions.wizard.cycleDaily')}</SelectItem>
                    <SelectItem value="weekly">{t('housing.admissions.wizard.cycleWeekly')}</SelectItem>
                    <SelectItem value="monthly">{t('housing.admissions.wizard.cycleMonthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('housing.admissions.wizard.currency')}</Label>
                <Select value={form.rateCurrency} onValueChange={v => setForm(f => ({ ...f, rateCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('housing.admissions.wizard.expectedDeparture')}</Label>
              <Input
                type="date"
                value={form.expectedDeparture}
                onChange={e => setForm(f => ({ ...f, expectedDeparture: e.target.value }))}
              />
            </div>
          </div>
        );
      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('housing.admissions.wizard.arrivalDate')}</Label>
              <Input
                type="datetime-local"
                value={form.arrivalDate}
                onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))}
                max={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('housing.admissions.wizard.arrivalDateHint')}</p>
            </div>
            <div>
              <Label>{t('housing.admissions.wizard.reason')}</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue placeholder={t('housing.admissions.wizard.selectReason')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boarding">{t('housing.admissions.reasons.boarding')}</SelectItem>
                  <SelectItem value="training">{t('housing.admissions.reasons.training')}</SelectItem>
                  <SelectItem value="medical">{t('housing.admissions.reasons.medical')}</SelectItem>
                  <SelectItem value="breeding">{t('housing.admissions.reasons.breeding')}</SelectItem>
                  <SelectItem value="temporary">{t('housing.admissions.reasons.temporary')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('housing.admissions.wizard.emergencyContact')}</Label>
              <Input
                value={form.emergencyContact}
                onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                placeholder={t('housing.admissions.wizard.emergencyContactPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('housing.admissions.wizard.specialInstructions')}</Label>
              <Textarea
                value={form.specialInstructions}
                onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                placeholder={t('housing.admissions.wizard.specialInstructionsPlaceholder')}
                rows={3}
              />
            </div>
          </div>
        );
      case 'review':
        return (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedHorse?.name || t('common.unknown')}</span>
                </div>
                {selectedClient && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <BilingualName name={selectedClient.name} nameAr={selectedClient.name_ar} inline primaryClassName="text-sm" />
                  </div>
                )}
                {form.branchId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{branches.find((b: any) => b.id === form.branchId)?.name}</span>
                  </div>
                )}
                {form.unitId && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DoorOpen className="h-4 w-4" />
                    <span>{filteredUnits.find(u => u.id === form.unitId)?.code}</span>
                  </div>
                )}
                {selectedPlan && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{displayServiceName(selectedPlan.name, selectedPlan.name_ar, lang)}</span>
                  </div>
                )}
                {(form.monthlyRate || form.dailyRate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {form.monthlyRate && `${form.monthlyRate} ${form.rateCurrency}/${t('housing.admissions.wizard.cycleMonthly').toLowerCase()}`}
                      {form.monthlyRate && form.dailyRate && ' | '}
                      {form.dailyRate && `${form.dailyRate} ${form.rateCurrency}/${t('housing.admissions.wizard.cycleDaily').toLowerCase()}`}
                    </span>
                  </div>
                )}
                {form.reason && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <Badge variant="outline" className="capitalize">{t(`housing.admissions.reasons.${form.reason}`)}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            {!form.clientId && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ {t('housing.admissions.warnings.noClient')}
              </Badge>
            )}
            {!form.unitId && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ {t('housing.admissions.warnings.noUnit')}
              </Badge>
            )}
          </div>
        );
    }
  };

  const stepIndicator = (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "text-xs px-2 py-1 rounded-full whitespace-nowrap",
            i === stepIndex ? "bg-primary text-primary-foreground" :
            i < stepIndex ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {stepLabels[s]}
          </div>
          {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
        </div>
      ))}
    </div>
  );

  const navigationFooter = (
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
        size="sm"
      >
        <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
        {stepIndex === 0 ? t('common.cancel') : t('common.back')}
      </Button>
      {step === 'review' ? (
        <Button onClick={handleSubmit} disabled={isCreating} size="sm">
          {isCreating ? t('common.loading') : t('housing.admissions.wizard.confirmAdmission')}
          <Check className="h-4 w-4 ms-1" />
        </Button>
      ) : (
        <Button onClick={goNext} disabled={!canGoNext()} size="sm">
          {t('common.next')}
          <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      )}
    </div>
  );

  const mobileContent = (
    <div className="space-y-4">
      {stepIndicator}
      {renderStep()}
      {navigationFooter}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('housing.admissions.wizard.title')}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">{mobileContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!grid-rows-none !grid-cols-none !flex !flex-col sm:max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Fixed header */}
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{t('housing.admissions.wizard.title')}</DialogTitle>
          </DialogHeader>
          <div className="mt-3">{stepIndicator}</div>
        </div>

        {/* Scrollable body — sole scroll owner */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {renderStep()}
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 border-t px-6 py-3">
          {navigationFooter}
        </div>
      </DialogContent>
    </Dialog>
  );
}
