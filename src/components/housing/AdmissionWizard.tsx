import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHorses } from "@/hooks/useHorses";
import { useBoardingAdmissions, type CreateAdmissionData } from "@/hooks/housing/useBoardingAdmissions";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { useHorseMovements, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check, Heart, User, Building2, DoorOpen, CreditCard, FileText } from "lucide-react";

interface AdmissionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = ['horse', 'client', 'housing', 'rates', 'details', 'review'] as const;
type Step = typeof STEPS[number];

export function AdmissionWizard({ open, onOpenChange, onSuccess }: AdmissionWizardProps) {
  const { t, dir } = useI18n();
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
    dailyRate: '' as string,
    monthlyRate: '' as string,
    billingCycle: 'monthly',
    rateCurrency: 'SAR',
    reason: '',
    specialInstructions: '',
    emergencyContact: '',
    expectedDeparture: '',
  });

  const { horses } = useHorses();
  const { createAdmission, isCreating } = useBoardingAdmissions();
  const { areas } = useFacilityAreas();
  const { units } = useHousingUnits();
  const { recordMovement } = useHorseMovements();
  const [clients, setClients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Load clients/branches when dialog opens
  useState(() => {
    if (!tenantId) return;
    supabase.from('clients').select('id, name, name_ar, phone').eq('tenant_id', tenantId).eq('status', 'active').then(({ data }) => {
      setClients(data || []);
    });
    supabase.from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).then(({ data }) => {
      setBranches(data || []);
    });
  });

  const selectedHorse = horses.find(h => h.id === form.horseId);
  const selectedClient = clients.find((c: any) => c.id === form.clientId);
  const filteredAreas = areas.filter(a => a.branch_id === form.branchId);
  const filteredUnits = units.filter(u => {
    if (form.areaId) return u.area_id === form.areaId;
    return u.branch_id === form.branchId;
  });

  const stepIndex = STEPS.indexOf(step);
  const canGoNext = () => {
    switch (step) {
      case 'horse': return !!form.horseId;
      case 'client': return true; // Optional
      case 'housing': return !!form.branchId;
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
        daily_rate: form.dailyRate ? parseFloat(form.dailyRate) : null,
        monthly_rate: form.monthlyRate ? parseFloat(form.monthlyRate) : null,
        billing_cycle: form.billingCycle,
        rate_currency: form.rateCurrency,
        reason: form.reason || undefined,
        special_instructions: form.specialInstructions || undefined,
        emergency_contact: form.emergencyContact || undefined,
        expected_departure: form.expectedDeparture || null,
      };

      await createAdmission(data);

      // Record check-in movement
      const movementData: CreateMovementData = {
        horse_id: form.horseId,
        movement_type: 'in',
        to_location_id: form.branchId,
        to_area_id: form.areaId || null,
        to_unit_id: form.unitId || null,
        reason: 'Boarding admission check-in',
        notes: form.specialInstructions || undefined,
      };

      await recordMovement(movementData);

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
      horseId: '', clientId: '', branchId: '', areaId: '', unitId: '',
      dailyRate: '', monthlyRate: '', billingCycle: 'monthly', rateCurrency: 'SAR',
      reason: '', specialInstructions: '', emergencyContact: '', expectedDeparture: '',
    });
  };

  const renderStep = () => {
    switch (step) {
      case 'horse':
        return (
          <div className="space-y-3">
            <Label>Select Horse *</Label>
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
                    <p className="font-medium text-sm truncate">{horse.name}</p>
                    {horse.name_ar && <p className="text-xs text-muted-foreground" dir="rtl">{horse.name_ar}</p>}
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
            <Label>Client / Payer (optional)</Label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, clientId: '' }))}
              className={cn(
                "w-full p-3 rounded-lg border text-start",
                !form.clientId ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <span className="text-sm text-muted-foreground">No client (assign later)</span>
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
                    <p className="font-medium text-sm">{client.name}</p>
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                  </div>
                  {form.clientId === client.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        );
      case 'housing':
        return (
          <div className="space-y-4">
            <div>
              <Label>Branch *</Label>
              <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v, areaId: '', unitId: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.branchId && filteredAreas.length > 0 && (
              <div>
                <Label>Area (optional)</Label>
                <Select value={form.areaId} onValueChange={v => setForm(f => ({ ...f, areaId: v, unitId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
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
                <Label>Unit / Stall (optional)</Label>
                <Select value={form.unitId} onValueChange={v => setForm(f => ({ ...f, unitId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
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
      case 'rates':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Daily Rate</Label>
                <Input
                  type="number"
                  value={form.dailyRate}
                  onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Monthly Rate</Label>
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
                <Label>Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={v => setForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.rateCurrency} onValueChange={v => setForm(f => ({ ...f, rateCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Expected Departure</Label>
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
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="breeding">Breeding</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergencyContact}
                onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Phone number or contact info"
              />
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={form.specialInstructions}
                onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                placeholder="Any special care requirements..."
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
                  <span className="font-medium">{selectedHorse?.name || 'Unknown'}</span>
                </div>
                {selectedClient && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{selectedClient.name}</span>
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
                {(form.monthlyRate || form.dailyRate) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {form.monthlyRate && `${form.monthlyRate} ${form.rateCurrency}/month`}
                      {form.monthlyRate && form.dailyRate && ' | '}
                      {form.dailyRate && `${form.dailyRate} ${form.rateCurrency}/day`}
                    </span>
                  </div>
                )}
                {form.reason && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <Badge variant="outline" className="capitalize">{form.reason}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            {!form.clientId && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ No client assigned
              </Badge>
            )}
            {!form.unitId && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ No housing unit assigned
              </Badge>
            )}
          </div>
        );
    }
  };

  const stepLabels: Record<Step, string> = {
    horse: 'Horse',
    client: 'Client',
    housing: 'Housing',
    rates: 'Rates',
    details: 'Details',
    review: 'Review',
  };

  const content = (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
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

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
          size="sm"
        >
          <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step === 'review' ? (
          <Button onClick={handleSubmit} disabled={isCreating} size="sm">
            {isCreating ? 'Creating...' : 'Confirm Admission'}
            <Check className="h-4 w-4 ms-1" />
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canGoNext()} size="sm">
            Next
            <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New Admission</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Admission</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
