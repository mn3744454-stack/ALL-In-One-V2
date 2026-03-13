import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSingleAdmission, useAdmissionStatusHistory, useBoardingAdmissions } from "@/hooks/housing/useBoardingAdmissions";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useStableServicePlans } from "@/hooks/housing/useStableServicePlans";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, differenceInDays } from "date-fns";
import {
  Heart, User, Building2, DoorOpen, CreditCard, Clock,
  CheckCircle2, AlertTriangle, LogOut, Calendar, FileText,
  Pencil, X, Check, Package, ArrowLeftRight, ArrowRight, ArrowLeft, Receipt
} from "lucide-react";
import { CheckoutDialog } from "./CheckoutDialog";
import { CareNotesList } from "./CareNotesList";
import { CreateInvoiceFromAdmission } from "./CreateInvoiceFromAdmission";

interface AdmissionDetailSheetProps {
  admissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdmissionDetailSheet({ admissionId, open, onOpenChange }: AdmissionDetailSheetProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const canCheckout = hasPermission('boarding.admission.checkout');
  const canUpdate = isOwner || hasPermission('boarding.admission.update');
  const { data: admission, isLoading } = useSingleAdmission(admissionId);
  const { data: history = [] } = useAdmissionStatusHistory(admissionId);
  const { updateAdmission } = useBoardingAdmissions();
  const { units } = useHousingUnits();
  const { areas } = useFacilityAreas();
  const { plans } = useStableServicePlans();
  const { clients } = useClients();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Billing links for this admission
  const { links: billingLinks, isLoading: billingLinksLoading } = useBillingLinks("boarding", admissionId || undefined);

  // Fetch actual invoice data for linked invoices
  const linkedInvoiceIds = useMemo(() => billingLinks.map(l => l.invoice_id).filter(Boolean), [billingLinks]);
  const { data: linkedInvoices = [] } = useQuery({
    queryKey: ["linked-invoices", linkedInvoiceIds.join(",")],
    queryFn: async () => {
      if (linkedInvoiceIds.length === 0) return [];
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total_amount, currency")
        .in("id", linkedInvoiceIds);
      return (data || []) as Array<{ id: string; invoice_number: string; status: string; total_amount: number; currency: string | null }>;
    },
    enabled: linkedInvoiceIds.length > 0,
  });

  const hasBilledInvoice = linkedInvoices.length > 0;
  const totalBilled = linkedInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const allPaid = hasBilledInvoice && linkedInvoices.every(inv => inv.status === "paid");

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNumValue, setEditNumValue] = useState<number | null>(null);

  const checks = admission?.admission_checks || {};
  const warnings = Object.entries(checks).filter(([, v]: [string, any]) => v?.status === 'warning');

  const isEditable = admission && !['checked_out', 'cancelled'].includes(admission.status);

  // Related movements query
  const { data: relatedMovements = [] } = useQuery({
    queryKey: ['admission-movements', tenantId, admissionId, admission?.horse_id],
    queryFn: async () => {
      if (!tenantId || !admission) return [];
      const horseId = admission.horse_id;
      const admittedAt = admission.admitted_at;
      const checkedOutAt = admission.checked_out_at;

      let query = supabase
        .from('horse_movements')
        .select(`
          id, movement_type, movement_status, movement_at, reason, notes,
          from_location:branches!horse_movements_from_location_id_fkey(id, name),
          to_location:branches!horse_movements_to_location_id_fkey(id, name),
          from_unit:housing_units!horse_movements_from_unit_id_fkey(id, code, name),
          to_unit:housing_units!horse_movements_to_unit_id_fkey(id, code, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .gte('movement_at', admittedAt)
        .order('movement_at', { ascending: true });

      if (checkedOutAt) {
        query = query.lte('movement_at', checkedOutAt);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!admission?.horse_id && open,
  });

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setEditNumValue(null);
  };

  const startNumEdit = (field: string, currentValue: number | null) => {
    setEditingField(field);
    setEditNumValue(currentValue);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setEditNumValue(null);
  };

  const saveEdit = async (field: string, value: string | null) => {
    if (!admission) return;
    try {
      await updateAdmission({
        admissionId: admission.id,
        [field]: value || null,
      });
      cancelEdit();
    } catch {
      // error handled in mutation
    }
  };

  const saveNumEdit = async (field: string, value: number | null) => {
    if (!admission) return;
    try {
      await updateAdmission({
        admissionId: admission.id,
        [field]: value,
      });
      cancelEdit();
    } catch {
      // error handled in mutation
    }
  };

  const handleUnitChange = async (unitId: string) => {
    if (!admission) return;
    const unit = units.find(u => u.id === unitId);
    try {
      await updateAdmission({
        admissionId: admission.id,
        unit_id: unitId || null,
        area_id: unit?.area_id || admission.area_id,
      });
    } catch {
      // error handled in mutation
    }
  };

  const handleClientChange = async (clientId: string) => {
    if (!admission) return;
    try {
      await updateAdmission({
        admissionId: admission.id,
        client_id: clientId === '_none' ? null : clientId,
      });
      cancelEdit();
    } catch {
      // error handled in mutation
    }
  };

  // Calculate stay duration
  const stayDuration = admission ? differenceInDays(
    admission.checked_out_at ? new Date(admission.checked_out_at) : new Date(),
    new Date(admission.admitted_at)
  ) : 0;

  // Estimated cost
  const estimatedCost = admission ? (() => {
    if (admission.monthly_rate && stayDuration > 0) {
      return Math.round((admission.monthly_rate / 30) * stayDuration * 100) / 100;
    }
    if (admission.daily_rate && stayDuration > 0) {
      return admission.daily_rate * stayDuration;
    }
    return null;
  })() : null;

  const branchUnits = admission ? units.filter(u => u.branch_id === admission.branch_id && u.is_active) : [];
  const activeClients = useMemo(() => clients.filter(c => c.status === 'active'), [clients]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('housing.admissions.detail.title')}</SheetTitle>
          </SheetHeader>

          {isLoading || !admission ? (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Horse Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={admission.horse?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {admission.horse?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{admission.horse?.name || t('common.unknown')}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <StatusBadge status={admission.status} t={t} />
                        {admission.reason && (
                          <Badge variant="outline" className="capitalize text-xs">
                            {t(`housing.admissions.reasons.${admission.reason}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Stay duration + estimated cost */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {stayDuration} {t('housing.admissions.detail.days')}
                    </span>
                    {estimatedCost !== null && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        ~{estimatedCost} {admission.rate_currency}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warnings — actionable */}
              {warnings.length > 0 && (
                <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-3 space-y-2">
                    {warnings.map(([key, val]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{val.message}</span>
                        </div>
                        {isEditable && canUpdate && key === 'no_unit' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => setEditingField('unit_id')}
                          >
                            {t('housing.admissions.detail.assignUnit')}
                          </Button>
                        )}
                        {isEditable && canUpdate && key === 'no_emergency_contact' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => startEdit('emergency_contact', '')}
                          >
                            {t('housing.admissions.detail.addContact')}
                          </Button>
                        )}
                        {isEditable && canUpdate && key === 'no_rate' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => startNumEdit('daily_rate', admission.daily_rate)}
                          >
                            {t('housing.admissions.detail.setRate')}
                          </Button>
                        )}
                        {isEditable && canUpdate && key === 'no_client' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs shrink-0"
                            onClick={() => setEditingField('client_id')}
                          >
                            {t('housing.admissions.detail.assignClient')}
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Details — with inline editing */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {/* Client — editable */}
                  {editingField === 'client_id' ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={admission.client_id || '_none'}
                        onValueChange={handleClientChange}
                      >
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue placeholder={t('housing.admissions.detail.assignClient')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">{t('housing.admissions.wizard.noClient')}</SelectItem>
                          {activeClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}{c.name_ar ? ` / ${c.name_ar}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <EditableDetailRow
                      icon={User}
                      label={t('housing.admissions.detail.client')}
                      value={admission.client?.name || t('housing.admissions.detail.notAssigned')}
                      canEdit={isEditable && canUpdate}
                      onEdit={() => setEditingField('client_id')}
                    />
                  )}

                  {admission.branch && (
                    <DetailRow icon={Building2} label={t('housing.admissions.detail.branch')} value={admission.branch.name} />
                  )}
                  {admission.area && (
                    <DetailRow 
                      icon={Building2} 
                      label={t('housing.admissions.detail.facility')} 
                      value={`${admission.area.name}${admission.area.facility_type ? ` (${t(`housing.facilityTypes.${admission.area.facility_type}`)})` : ''}`} 
                    />
                  )}

                  {/* Unit — editable */}
                  {editingField === 'unit_id' ? (
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={admission.unit?.id || ''}
                        onValueChange={(v) => {
                          handleUnitChange(v);
                          setEditingField(null);
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue placeholder={t('housing.admissions.detail.assignUnit')} />
                        </SelectTrigger>
                        <SelectContent>
                          {branchUnits.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.code}{u.name ? ` - ${u.name}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <EditableDetailRow
                      icon={DoorOpen}
                      label={t('housing.admissions.detail.unit')}
                      value={admission.unit?.code || t('housing.admissions.detail.notAssigned')}
                      canEdit={isEditable && canUpdate}
                      onEdit={() => setEditingField('unit_id')}
                    />
                  )}

                  {/* Plan */}
                  {admission.plan_id && (() => {
                    const plan = plans.find(p => p.id === admission.plan_id);
                    const planLabel = plan ? (dir === 'rtl' && plan.name_ar ? plan.name_ar : plan.name) : admission.plan_id;
                    return <DetailRow icon={Package} label={t('housing.plans.title')} value={planLabel} />;
                  })()}

                  <DetailRow icon={Calendar} label={t('housing.admissions.detail.admittedAt')} value={format(new Date(admission.admitted_at), 'PPp')} />

                  {/* Expected departure — editable */}
                  {editingField === 'expected_departure' ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit('expected_departure', editValue)}>
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : admission.expected_departure ? (
                    <EditableDetailRow
                      icon={Calendar}
                      label={t('housing.admissions.detail.expectedDeparture')}
                      value={format(new Date(admission.expected_departure), 'PP')}
                      canEdit={isEditable && canUpdate}
                      onEdit={() => startEdit('expected_departure', admission.expected_departure?.split('T')[0] || '')}
                    />
                  ) : isEditable && canUpdate ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => startEdit('expected_departure', '')}
                      >
                        + {t('housing.admissions.detail.addDeparture')}
                      </Button>
                    </div>
                  ) : null}

                  {admission.checked_out_at && (
                    <DetailRow icon={LogOut} label={t('housing.admissions.detail.checkedOutAt')} value={format(new Date(admission.checked_out_at), 'PPp')} />
                  )}

                  {/* Rate — editable */}
                  {editingField === 'daily_rate' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard className="h-4 w-4 shrink-0" />
                        <span>{t('housing.admissions.detail.rate')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">{t('housing.admissions.wizard.dailyRate')}</label>
                          <Input
                            type="number"
                            value={editNumValue ?? ''}
                            onChange={e => setEditNumValue(e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t('housing.admissions.wizard.monthlyRate')}</label>
                          <Input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={async () => {
                            if (!admission) return;
                            try {
                              await updateAdmission({
                                admissionId: admission.id,
                                daily_rate: editNumValue || null,
                                monthly_rate: editValue ? parseFloat(editValue) : null,
                              });
                              cancelEdit();
                            } catch { /* handled */ }
                          }}
                        >
                          <Check className="h-3.5 w-3.5 me-1" />{t('common.save')}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={cancelEdit}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EditableDetailRow
                      icon={CreditCard}
                      label={t('housing.admissions.detail.rate')}
                      value={
                        (admission.monthly_rate || admission.daily_rate)
                          ? `${admission.daily_rate ? `${admission.daily_rate}/${t('housing.admissions.wizard.cycleDaily').toLowerCase()}` : ''}${admission.daily_rate && admission.monthly_rate ? ' · ' : ''}${admission.monthly_rate ? `${admission.monthly_rate}/${t('housing.admissions.wizard.cycleMonthly').toLowerCase()}` : ''} ${admission.rate_currency}`
                          : t('housing.admissions.detail.notAssigned')
                      }
                      canEdit={isEditable && canUpdate}
                      onEdit={() => {
                        setEditingField('daily_rate');
                        setEditNumValue(admission.daily_rate);
                        setEditValue(admission.monthly_rate?.toString() || '');
                      }}
                    />
                  )}

                  {/* Special instructions — editable */}
                  {editingField === 'special_instructions' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{t('housing.admissions.detail.instructions')}</span>
                      </div>
                      <Textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => saveEdit('special_instructions', editValue)}>
                          <Check className="h-3.5 w-3.5 me-1" />{t('common.save')}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={cancelEdit}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EditableDetailRow
                      icon={FileText}
                      label={t('housing.admissions.detail.instructions')}
                      value={admission.special_instructions || '—'}
                      canEdit={isEditable && canUpdate}
                      onEdit={() => startEdit('special_instructions', admission.special_instructions || '')}
                    />
                  )}

                  {/* Emergency contact — editable */}
                  {editingField === 'emergency_contact' ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder={t('housing.admissions.wizard.emergencyContactPlaceholder')}
                        className="h-8 text-sm flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit('emergency_contact', editValue)}>
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <EditableDetailRow
                      icon={User}
                      label={t('housing.admissions.detail.emergencyContact')}
                      value={admission.emergency_contact || '—'}
                      canEdit={isEditable && canUpdate}
                      onEdit={() => startEdit('emergency_contact', admission.emergency_contact || '')}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Related Movements */}
              {relatedMovements.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      {t('housing.admissions.detail.movements')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {relatedMovements.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2 text-sm flex-wrap">
                          <MovementTypeIcon type={m.movement_type} />
                          <span className="text-muted-foreground">
                            {format(new Date(m.movement_at), 'MMM d, HH:mm')}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {m.movement_type === 'in'
                              ? t('housing.admissions.detail.checkin')
                              : m.movement_type === 'out'
                              ? t('housing.admissions.detail.checkout')
                              : t('housing.tabs.movement')}
                          </Badge>
                          {m.movement_status && m.movement_status !== 'completed' && (
                            <Badge variant="secondary" className="text-[10px]">{m.movement_status}</Badge>
                          )}
                          {m.from_unit && m.to_unit && (
                            <span className="text-xs text-muted-foreground">
                              {m.from_unit.code} → {m.to_unit.code}
                            </span>
                          )}
                          {m.reason && (
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {m.reason}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('housing.admissions.detail.statusHistory')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      {history.map((h: any) => (
                        <div key={h.id} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-muted-foreground">{format(new Date(h.created_at), 'MMM d, HH:mm')}</span>
                          <span>→ <Badge variant="outline" className="text-xs capitalize">{h.to_status}</Badge></span>
                          {h.changed_by_profile?.full_name && (
                            <span className="text-muted-foreground text-xs">
                              {t('housing.admissions.detail.by')} {h.changed_by_profile.full_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Care Notes */}
              {admission.horse_id && (
                <CareNotesList
                  horseId={admission.horse_id}
                  admissionId={admission.id}
                />
              )}

              {/* Linked Invoices */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    {t('housing.admissions.billing.linkedInvoices')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {billingLinks.length > 0 ? (
                    <div className="space-y-2">
                      {billingLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="capitalize">{link.link_kind}</span>
                          </div>
                          <span className="font-medium">{link.amount?.toFixed(2) || '—'} {admission.rate_currency || 'SAR'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('housing.admissions.billing.noLinkedInvoices')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {admission.status === 'active' && (admission.daily_rate || admission.monthly_rate) && (
                  billingLinks.length > 0 ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setInvoiceDialogOpen(true)}
                    >
                      <Receipt className="h-4 w-4 me-1" />
                      {t('housing.admissions.billing.viewInvoices')} ({billingLinks.length})
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setInvoiceDialogOpen(true)}
                    >
                      <Receipt className="h-4 w-4 me-1" />
                      {t('housing.admissions.billing.generateInvoice')}
                    </Button>
                  )
                )}

                {canCheckout && (admission.status === 'active' || admission.status === 'checkout_pending') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    <LogOut className="h-4 w-4 me-1" />
                    {admission.status === 'checkout_pending'
                      ? t('housing.admissions.checkout.confirmCheckout')
                      : t('housing.admissions.checkout.initiateCheckout')
                    }
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {admission && (
        <CheckoutDialog
          admission={admission}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSuccess={() => {
            setCheckoutOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {admission && (
        <CreateInvoiceFromAdmission
          admission={admission}
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
        />
      )}
    </>
  );
}

function MovementTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'in': return <ArrowRight className="h-3.5 w-3.5 text-green-600 shrink-0" />;
    case 'out': return <ArrowLeft className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    case 'transfer': return <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    default: return <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  switch (status) {
    case 'active': return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 me-1" />{t('housing.admissions.status.active')}</Badge>;
    case 'checkout_pending': return <Badge variant="outline" className="text-amber-600"><Clock className="h-3 w-3 me-1" />{t('housing.admissions.status.checkoutPending')}</Badge>;
    case 'checked_out': return <Badge variant="secondary"><LogOut className="h-3 w-3 me-1" />{t('housing.admissions.status.checkedOut')}</Badge>;
    case 'draft': return <Badge variant="outline">{t('housing.admissions.status.draft')}</Badge>;
    case 'cancelled': return <Badge variant="destructive">{t('housing.admissions.status.cancelled')}</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function EditableDetailRow({ icon: Icon, label, value, canEdit, onEdit }: {
  icon: React.ElementType;
  label: string;
  value: string;
  canEdit?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-sm group">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
