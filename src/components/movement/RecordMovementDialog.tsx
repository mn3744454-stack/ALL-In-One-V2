import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { SafeFormDialog, SafeFormDrawer } from "@/components/ui/safe-form-dialog";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocations } from "@/hooks/movement/useLocations";
import { useHorseMovements, type MovementType, type MovementSubtype, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { useExternalLocations } from "@/hooks/movement/useExternalLocations";
import { useConnectedDestinations } from "@/hooks/movement/useConnectedDestinations";
import { useConnectedMovement } from "@/hooks/movement/useConnectedMovement";
import { useEligibleHorses } from "@/hooks/movement/useEligibleHorses";
import { useHorseLifecycleStates } from "@/hooks/movement/useHorseLifecycleStates";
import { HorseLifecycleChip } from "@/components/horses/HorseLifecycleChip";
import { useFacilityAreas } from "@/hooks/housing/useFacilityAreas";
import { useHousingUnits } from "@/hooks/housing/useHousingUnits";
import { usePermissions } from "@/hooks/usePermissions";
import { useConnections } from "@/hooks/connections/useConnections";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { AddPartnerDialog } from "@/components/connections/AddPartnerDialog";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { HousingSelector } from "./HousingSelector";
import { Switch } from "@/components/ui/switch";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Check, ChevronLeft, ChevronRight, Building2, DoorOpen, MapPin, Plus, Link2, Calendar, UserPlus, Clock, Search, PlusCircle, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface RecordMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /**
   * AD-1 Pass 2-C — optional prefill for entry from contextual actions
   * (e.g. "Record return" on a temporarily-out horse). When provided, the
   * wizard skips type/source choices and lets the user pick destination.
   */
  prefill?: {
    horseId: string;
    movementType: MovementType;
    movementSubtype?: MovementSubtype;
  } | null;
}

type DestinationType = 'internal' | 'external' | 'connected';
type ArrivalSource = 'existing' | 'new_horse';

// Steps vary by movement type & arrival source
type Step = "type" | "arrival_source" | "horse" | "new_horse" | "location" | "housing" | "details" | "review";

export function RecordMovementDialog({
  open, onOpenChange, onSuccess, prefill,
}: RecordMovementDialogProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();
  const { activeTenant } = useTenant();

  const [step, setStep] = useState<Step>("type");
  const [arrivalSource, setArrivalSource] = useState<ArrivalSource | null>(null);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [movementDate, setMovementDate] = useState('');
  const [horseSearch, setHorseSearch] = useState('');
  const [formData, setFormData] = useState<{
    movementType: MovementType | null;
    horseId: string | null;
    destinationType: DestinationType;
    fromLocationId: string | null;
    toLocationId: string | null;
    toExternalLocationId: string | null;
    fromExternalLocationId: string | null;
    connectedTenantId: string | null;
    toAreaId: string | null;
    toUnitId: string | null;
    reason: string;
    notes: string;
    internalLocationNote: string;
    /** AD-1 Pass 2-C: explicit subtype choice (departures + returns). */
    subtypeChoice: 'checkout_departure' | 'temporary_out' | 'return_from_temporary_out' | null;
  }>({
    movementType: null, horseId: null, destinationType: 'internal',
    fromLocationId: null, toLocationId: null,
    toExternalLocationId: null, fromExternalLocationId: null,
    connectedTenantId: null,
    toAreaId: null, toUnitId: null,
    reason: "", notes: "", internalLocationNote: "",
    subtypeChoice: null,
  });

  // Apply prefill once when dialog opens with a prefill payload.
  useEffect(() => {
    if (!open || !prefill) return;
    setFormData(prev => ({
      ...prev,
      movementType: prefill.movementType,
      horseId: prefill.horseId,
      subtypeChoice: prefill.movementSubtype === 'return_from_temporary_out'
        ? 'return_from_temporary_out'
        : prefill.movementSubtype === 'temporary_out'
          ? 'temporary_out'
          : prefill.movementSubtype === 'checkout_departure'
            ? 'checkout_departure'
            : prev.subtypeChoice,
    }));
    if (prefill.movementType === 'in') {
      setArrivalSource('existing');
      setStep('location');
    } else {
      setStep('location');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // New horse inline intake
  const [newHorse, setNewHorse] = useState({
    name: '', name_ar: '', gender: 'male' as 'male' | 'female',
    birth_date: '', microchip_number: '', passport_number: '',
    breed: '', color: '', notes: '',
  });

  // Inline new external location form
  const [showNewExternal, setShowNewExternal] = useState(false);
  const [newExtName, setNewExtName] = useState('');
  const [newExtCity, setNewExtCity] = useState('');
  const [newExtType, setNewExtType] = useState('other');
  const [showPartnerRequest, setShowPartnerRequest] = useState(false);

  const { activeLocations } = useLocations();
  const { eligibleHorses, allHorses, loading: horsesLoading } = useEligibleHorses(
    formData.movementType,
    formData.fromLocationId
  );
  const { statesByHorseId: lifecycleByHorseId } = useHorseLifecycleStates(eligibleHorses.map(h => h.id));
  const { recordMovement, isRecording } = useHorseMovements();
  const { externalLocations, createExternalLocation, isCreating: isCreatingExternal } = useExternalLocations();
  const { destinations: connectedDestinations } = useConnectedDestinations();
  const { recordConnectedMovement, isRecording: isRecordingConnected } = useConnectedMovement();
  
  // Pending outbound B2B
  const { data: pendingOutboundRequests = [] } = useQuery({
    queryKey: ['pending-outbound-b2b', activeTenant?.tenant?.id],
    queryFn: async () => {
      const tenantId = activeTenant?.tenant?.id;
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('connections')
        .select('id, recipient_tenant_id, created_at')
        .eq('initiator_tenant_id', tenantId)
        .eq('connection_type', 'b2b')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error || !data?.length) return [];
      const ids = data.map(c => c.recipient_tenant_id).filter(Boolean) as string[];
      if (!ids.length) return [];
      const { data: tenants } = await supabase.from('tenants').select('id, name').in('id', ids);
      const nameMap = new Map((tenants || []).map(t => [t.id, t.name]));
      return data.map(c => ({ id: c.id, name: nameMap.get(c.recipient_tenant_id!) || 'Unknown', created_at: c.created_at }));
    },
    enabled: !!activeTenant?.tenant?.id,
  });
  
  const { hasPermission, isOwner } = usePermissions();
  const { createConnection } = useConnections();
  const canSendConnected = isOwner || hasPermission('movement.connected.create');
  
  const { activeAreas } = useFacilityAreas(formData.toLocationId || undefined);
  const { activeUnits } = useHousingUnits(formData.toLocationId || undefined, formData.toAreaId || undefined);

  // Compute effective steps based on movement type
  const effectiveSteps = useMemo((): Step[] => {
    if (!formData.movementType) return ["type"];
    
    if (formData.movementType === "in") {
      if (!arrivalSource) return ["type", "arrival_source"];
      if (arrivalSource === "new_horse") {
        return ["type", "arrival_source", "new_horse", "location", "housing", "details", "review"];
      }
      return ["type", "arrival_source", "horse", "location", "housing", "details", "review"];
    }
    
    if (formData.movementType === "out") {
      return ["type", "horse", "location", "details", "review"];
    }
    
    // Transfer
    return ["type", "horse", "location", "housing", "details", "review"];
  }, [formData.movementType, arrivalSource]);

  // Selected horse for review / auto-fill
  const selectedHorse = allHorses.find(h => h.id === formData.horseId);
  const fromLocation = activeLocations.find(l => l.id === formData.fromLocationId);
  const toLocation = activeLocations.find(l => l.id === formData.toLocationId);
  const toExtLocation = externalLocations.find(l => l.id === formData.toExternalLocationId);
  const connectedDest = connectedDestinations.find(d => d.id === formData.connectedTenantId);
  const selectedArea = activeAreas.find(a => a.id === formData.toAreaId);
  const selectedUnit = activeUnits.find(u => u.id === formData.toUnitId);

  const isSameBranchTransfer = formData.destinationType === 'internal' && formData.movementType === 'transfer' && 
    formData.fromLocationId && formData.toLocationId && 
    formData.fromLocationId === formData.toLocationId;

  // AD-1 Pass 2-C: an internal "out" between two different branches is
  // reclassified to a transfer downstream — so it does NOT need a checkout
  // vs temporary-out choice. Connected outgoing uses a different RPC and
  // also skips this picker. Everything else (external + same-branch out)
  // requires the user to explicitly pick the departure subtype.
  const isInternalBranchToBranchOut =
    formData.movementType === 'out' &&
    formData.destinationType === 'internal' &&
    !!formData.toLocationId &&
    !!formData.fromLocationId &&
    formData.toLocationId !== formData.fromLocationId;
  const requiresDepartureSubtype =
    formData.movementType === 'out' &&
    formData.destinationType !== 'connected' &&
    !isInternalBranchToBranchOut;

  // Auto-fill FROM when horse is selected for OUT/TRANSFER
  const autoFillOrigin = (horseId: string) => {
    const horse = allHorses.find(h => h.id === horseId);
    if (horse?.current_location_id && (formData.movementType === 'out' || formData.movementType === 'transfer')) {
      setFormData(prev => ({
        ...prev,
        horseId,
        fromLocationId: horse.current_location_id || null,
      }));
    } else {
      setFormData(prev => ({ ...prev, horseId }));
    }
  };

  // Filtered horse list with search
  const filteredHorses = useMemo(() => {
    if (!horseSearch.trim()) return eligibleHorses;
    const q = horseSearch.toLowerCase();
    return eligibleHorses.filter(h =>
      h.name?.toLowerCase().includes(q) ||
      h.name_ar?.includes(horseSearch) ||
      h.microchip_number?.toLowerCase().includes(q) ||
      h.passport_number?.toLowerCase().includes(q) ||
      h.ueln?.toLowerCase().includes(q)
    );
  }, [eligibleHorses, horseSearch]);

  const getStepIssues = (s: Step): string[] => {
    const issues: string[] = [];
    switch (s) {
      case "type":
        if (!formData.movementType) issues.push(t("movement.guards.selectMovementType"));
        break;
      case "arrival_source":
        if (!arrivalSource) issues.push(t("movement.guards.selectArrivalSource"));
        break;
      case "horse":
        if (!formData.horseId) issues.push(t("movement.guards.selectHorse"));
        break;
      case "new_horse":
        if (!newHorse.name.trim()) issues.push(t("movement.guards.horseName"));
        if (!newHorse.gender) issues.push(t("movement.guards.horseGender"));
        break;
      case "location": {
        if (formData.destinationType === 'connected') {
          if (formData.movementType === 'out') {
            if (!formData.fromLocationId) issues.push(t("movement.guards.fromLocation"));
            if (!formData.connectedTenantId) issues.push(t("movement.guards.connectedPartner"));
          } else {
            issues.push(t("movement.guards.connectedDirectionUnsupported"));
          }
          break;
        }
        if (formData.destinationType === 'external') {
          if (formData.movementType === 'out') {
            if (!formData.fromLocationId) issues.push(t("movement.guards.fromLocation"));
            if (!formData.toExternalLocationId) issues.push(t("movement.guards.externalDestination"));
          } else if (formData.movementType === 'in') {
            if (!formData.toLocationId) issues.push(t("movement.guards.toLocation"));
          }
          break;
        }
        if (formData.movementType === "in" && !formData.toLocationId) issues.push(t("movement.guards.toLocation"));
        if (formData.movementType === "out" && !formData.fromLocationId) issues.push(t("movement.guards.fromLocation"));
        if (formData.movementType === "transfer") {
          if (!formData.fromLocationId) issues.push(t("movement.guards.fromLocation"));
          if (!formData.toLocationId) issues.push(t("movement.guards.toLocation"));
          if (formData.fromLocationId && formData.toLocationId && formData.fromLocationId === formData.toLocationId) {
            issues.push(t("movement.guards.sameBranchTransfer"));
          }
        }
        break;
      }
      case "details":
      case "review":
        if (requiresDepartureSubtype && !formData.subtypeChoice) issues.push(t("movement.guards.departureSubtype"));
        break;
    }
    return issues;
  };
  const canGoNext = () => getStepIssues(step).length === 0;

  const [attempted, setAttempted] = useState(false);
  const currentIssues = getStepIssues(step);

  const dirtyValue = useMemo(
    () => ({ formData, newHorse, arrivalSource, scheduleForLater, scheduledAt, movementDate }),
    [formData, newHorse, arrivalSource, scheduleForLater, scheduledAt, movementDate]
  );
  const { isDirty } = useDirtyForm(dirtyValue, open);

  const handleNext = () => {
    if (!canGoNext()) { setAttempted(true); return; }
    setAttempted(false);
    const currentIndex = effectiveSteps.indexOf(step);
    if (currentIndex < effectiveSteps.length - 1) {
      setStep(effectiveSteps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = effectiveSteps.indexOf(step);
    if (currentIndex > 0) {
      setStep(effectiveSteps[currentIndex - 1]);
    }
  };

  const handleHousingSkip = () => handleNext();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.movementType || isSubmitting) return;

    // AD-1 Pass 1.1: surface tenant errors instead of silent returns.
    const tenantId = activeTenant?.tenant_id ?? activeTenant?.tenant?.id ?? null;
    if (!tenantId) {
      toast.error(t("movement.toasts.noActiveOrganization"));
      return;
    }

    setIsSubmitting(true);

    let horseId = formData.horseId;
    let createdNewHorseId: string | null = null;

    try {
      // If new horse, create it first with intake_draft status.
      // NOTE: if movement creation later fails, the orphan horse remains as
      // intake_draft and is reachable from the Horses list (filter: incomplete
      // profiles); the user can complete or delete it manually.
      if (arrivalSource === 'new_horse' && !horseId) {
        const { data: createdHorse, error: createError } = await supabase
          .from("horses")
          .insert({
            name: newHorse.name.trim(),
            name_ar: newHorse.name_ar.trim() || null,
            gender: newHorse.gender,
            birth_date: newHorse.birth_date || null,
            microchip_number: newHorse.microchip_number.trim() || null,
            passport_number: newHorse.passport_number.trim() || null,
            breed: newHorse.breed.trim() || null,
            color: newHorse.color.trim() || null,
            notes: newHorse.notes.trim() || null,
            tenant_id: tenantId,
            status: 'intake_draft',
          })
          .select('id')
          .single();

        if (createError || !createdHorse) {
          toast.error(createError?.message || t("movement.toasts.failedToCreateHorse"));
          return;
        }
        horseId = createdHorse.id;
        createdNewHorseId = createdHorse.id;
        toast.success(t("movement.arrival.horseCreated").replace("{{name}}", newHorse.name));
      }

      if (!horseId) {
        toast.error(t("movement.toasts.horseRequired"));
        return;
      }

      // ---- Unified scheduled-status derivation (AD-1 Pass 1.1) ----
      // A movement is "scheduled" when EITHER the explicit toggle is on OR
      // the chosen movement_at falls in the future. This prevents future-dated
      // arrivals/transfers from being incorrectly persisted as completed.
      // AD-1 Pass 1.3: convert <input type="datetime-local"> values (which are
      // timezone-less local strings, e.g. "2026-05-09T21:55") to a proper
      // timezone-aware ISO string so Postgres timestamptz stores the user's
      // intended local time correctly. `new Date(localString)` parses as local.
      const toIsoLocal = (s: string | undefined | null): string | undefined => {
        if (!s) return undefined;
        const d = new Date(s);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      };
      const scheduledAtIso = toIsoLocal(scheduledAt);
      const movementDateIso = toIsoLocal(movementDate);
      const explicitSchedule = scheduleForLater && !!scheduledAtIso;
      const futureMovementDate = !!movementDateIso && new Date(movementDateIso).getTime() > Date.now();
      const isScheduled = explicitSchedule || futureMovementDate;
      const effectiveMovementAt = explicitSchedule ? scheduledAtIso : movementDateIso;

      // Connected movement uses a separate RPC
      if (formData.destinationType === 'connected' && formData.connectedTenantId) {
        await recordConnectedMovement({
          horse_id: horseId,
          connected_tenant_id: formData.connectedTenantId,
          from_location_id: formData.fromLocationId,
          movement_at: isScheduled ? effectiveMovementAt : undefined,
          reason: formData.reason || undefined,
          notes: formData.notes || undefined,
        });
        onOpenChange(false);
        resetForm();
        onSuccess?.();
        return;
      }

      const currentHorse = allHorses.find(h => h.id === horseId);

      // AD-1 Pass 1.3: an internal "out" to a different branch is logically a
      // transfer, not a checkout. Re-classify so the BEFORE INSERT trigger
      // assigns movement_subtype = 'internal_transfer' (not checkout_departure)
      // and the financial checkout gate / admission close logic does not fire.
      const isInternalBranchToBranch =
        formData.movementType === 'out' &&
        formData.destinationType === 'internal' &&
        !!formData.toLocationId &&
        !!formData.fromLocationId &&
        formData.toLocationId !== formData.fromLocationId;
      const effectiveMovementType: MovementType = isInternalBranchToBranch
        ? 'transfer'
        : formData.movementType;

      // AD-1 Pass 2-C: only forward an explicit subtype when it actually
      // matches the effective type. Internal-branch-to-branch is reclassified
      // to 'transfer' and must let the trigger assign 'internal_transfer'.
      let effectiveSubtype: MovementSubtype | undefined;
      if (!isInternalBranchToBranch && formData.subtypeChoice) {
        if (effectiveMovementType === 'out' &&
          (formData.subtypeChoice === 'temporary_out' || formData.subtypeChoice === 'checkout_departure')) {
          effectiveSubtype = formData.subtypeChoice;
        } else if (effectiveMovementType === 'in' && formData.subtypeChoice === 'return_from_temporary_out') {
          effectiveSubtype = formData.subtypeChoice;
        }
      }

      // Temporary out must NOT clear housing or close admission.
      const isTemporaryOut = effectiveSubtype === 'temporary_out';

      const data: CreateMovementData = {
        horse_id: horseId,
        movement_type: effectiveMovementType,
        from_location_id: formData.fromLocationId,
        to_location_id: formData.toLocationId,
        from_area_id: currentHorse?.current_area_id || null,
        from_unit_id: currentHorse?.housing_unit_id || null,
        to_area_id: formData.toAreaId,
        to_unit_id: formData.toUnitId,
        movement_at: effectiveMovementAt,
        reason: formData.reason || undefined,
        notes: formData.notes || undefined,
        internal_location_note: formData.internalLocationNote || undefined,
        clear_housing: isScheduled
          ? false
          : effectiveMovementType === 'out' && !isTemporaryOut,
        destination_type: formData.destinationType,
        from_external_location_id: formData.fromExternalLocationId,
        to_external_location_id: formData.toExternalLocationId,
        movement_status: isScheduled ? 'scheduled' : undefined,
        scheduled_at: isScheduled ? effectiveMovementAt : undefined,
        movement_subtype: effectiveSubtype,
      };


      await recordMovement(data);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      // recordMovement already toasts via mutation onError; this guards against
      // any other unexpected failure (network, supabase client error). We keep
      // the dialog open so the user can retry without losing entered data.
      const message = err?.message || t("movement.toasts.failedToRecord");
      // Avoid double-toasting: only toast if the message wasn't already surfaced
      // by the mutation onError handler.
      if (!err?.__toasted) toast.error(message);
      if (createdNewHorseId) {
        // Horse was created but movement failed — let the user know it's findable.
        toast.message(t("movement.toasts.horseCreatedMovementFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("type");
    setArrivalSource(null);
    setHorseSearch('');
    setFormData({
      movementType: null, horseId: null, destinationType: 'internal',
      fromLocationId: null, toLocationId: null,
      toExternalLocationId: null, fromExternalLocationId: null,
      connectedTenantId: null,
      toAreaId: null, toUnitId: null,
      reason: "", notes: "", internalLocationNote: "",
      subtypeChoice: null,
    });
    setNewHorse({ name: '', name_ar: '', gender: 'male', birth_date: '', microchip_number: '', passport_number: '', breed: '', color: '', notes: '' });
    setShowNewExternal(false);
    setNewExtName('');
    setNewExtCity('');
    setNewExtType('other');
    setScheduleForLater(false);
    setScheduledAt('');
    setMovementDate('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const content = (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Sticky progress indicator */}
      <div className="shrink-0 flex items-center justify-center gap-2 pb-4">
        {effectiveSteps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              effectiveSteps.indexOf(step) >= i ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1">
        <div className="min-h-[200px]">
        {/* === STEP: TYPE === */}
        {step === "type" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step1Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step1Desc")}</p>
            <div className="grid gap-3">
              {(["in", "out", "transfer"] as MovementType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    // H3: when switching to Departure, force destinationType
                    // off "internal" since the Internal option is no longer
                    // exposed in the UI for OUT movements.
                    setFormData({
                      ...formData,
                      movementType: type,
                      horseId: null,
                      fromLocationId: null,
                      destinationType: type === "out" ? "external" : "internal",
                      toLocationId: null,
                      toExternalLocationId: null,
                      connectedTenantId: null,
                    });
                    setArrivalSource(null);
                  }}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-start",
                    formData.movementType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    type === "in" ? "bg-emerald-100 text-emerald-600" :
                    type === "out" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {type === "in" && <ArrowDownToLine className="h-6 w-6" />}
                    {type === "out" && <ArrowUpFromLine className="h-6 w-6" />}
                    {type === "transfer" && <ArrowLeftRight className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{t(`movement.types.${type}`)}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {t(`movement.types.${type}Helper`)}
                    </p>
                  </div>
                  {formData.movementType === type && (
                    <Check className="h-5 w-5 text-primary shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === STEP: ARRIVAL SOURCE (IN only) === */}
        {step === "arrival_source" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.arrival.sourceTitle")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.arrival.sourceDesc")}</p>
            <div className="grid gap-3">
              <button
                onClick={() => setArrivalSource("existing")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-start",
                  arrivalSource === "existing" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t("movement.arrival.existingHorse")}</p>
                  <p className="text-xs text-muted-foreground">{t("movement.arrival.existingHorseDesc")}</p>
                </div>
                {arrivalSource === "existing" && <Check className="h-5 w-5 text-primary" />}
              </button>
              <button
                onClick={() => setArrivalSource("new_horse")}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-start",
                  arrivalSource === "new_horse" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t("movement.arrival.newHorse")}</p>
                  <p className="text-xs text-muted-foreground">{t("movement.arrival.newHorseDesc")}</p>
                </div>
                {arrivalSource === "new_horse" && <Check className="h-5 w-5 text-primary" />}
              </button>
            </div>
          </div>
        )}

        {/* === STEP: HORSE SELECTION (with search) === */}
        {step === "horse" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step2Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step2Desc")}</p>
            
            {/* Search input */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("movement.arrival.searchHorses")}
                value={horseSearch}
                onChange={(e) => setHorseSearch(e.target.value)}
                className="ps-9"
              />
            </div>

            <div className="space-y-2">
              {filteredHorses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t("movement.arrival.noEligibleHorses")}</p>
                  {formData.movementType === 'in' && (
                    <p className="text-xs mt-1">{t("movement.arrival.noEligibleHorsesHint")}</p>
                  )}
                </div>
              ) : (
                filteredHorses.map((horse) => (
                  <button
                    key={horse.id}
                    onClick={() => autoFillOrigin(horse.id)}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-lg border-2 transition-all text-start",
                      formData.horseId === horse.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={horse.avatar_url || undefined} />
                      <AvatarFallback>{horse.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{horse.name}</p>
                        <HorseLifecycleChip state={lifecycleByHorseId.get(horse.id) ?? null} hideUnknown size="xs" />
                      </div>
                      {horse.name_ar && (
                        <p className="text-sm text-muted-foreground">{horse.name_ar}</p>
                      )}
                      {/* Show current location for OUT/TRANSFER */}
                      {(formData.movementType === 'out' || formData.movementType === 'transfer') && horse.current_location_id && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {activeLocations.find(l => l.id === horse.current_location_id)?.name || ''}
                        </p>
                      )}
                    </div>
                    {formData.horseId === horse.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* === STEP: NEW HORSE INLINE INTAKE === */}
        {step === "new_horse" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.arrival.newHorseTitle")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.arrival.newHorseSubtitle")}</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("horses.wizard.name")} *</Label>
                  <Input
                    value={newHorse.name}
                    onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })}
                    placeholder={t("horses.wizard.name")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("horses.wizard.nameAr")}</Label>
                  <Input
                    value={newHorse.name_ar}
                    onChange={(e) => setNewHorse({ ...newHorse, name_ar: e.target.value })}
                    placeholder={t("horses.wizard.nameAr")}
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label>{t("horses.wizard.gender")} *</Label>
                <Select value={newHorse.gender} onValueChange={(v: 'male' | 'female') => setNewHorse({ ...newHorse, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("horses.gender.male")}</SelectItem>
                    <SelectItem value="female">{t("horses.gender.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("horses.wizard.birthDate")}</Label>
                <Input
                  type="date"
                  value={newHorse.birth_date}
                  onChange={(e) => setNewHorse({ ...newHorse, birth_date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("horses.profile.microchip")}</Label>
                  <Input
                    value={newHorse.microchip_number}
                    onChange={(e) => setNewHorse({ ...newHorse, microchip_number: e.target.value })}
                    placeholder={t("horses.profile.microchip")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("horses.profile.passport")}</Label>
                  <Input
                    value={newHorse.passport_number}
                    onChange={(e) => setNewHorse({ ...newHorse, passport_number: e.target.value })}
                    placeholder={t("horses.profile.passport")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("movement.arrival.sourceNotes")}</Label>
                <Textarea
                  value={newHorse.notes}
                  onChange={(e) => setNewHorse({ ...newHorse, notes: e.target.value })}
                  placeholder={t("movement.arrival.sourceNotesPlaceholder")}
                  rows={2}
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t("movement.arrival.incompleteProfileHint")}
              </p>
            </div>
          </div>
        )}

        {/* === STEP: LOCATION === */}
        {step === "location" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step3Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step3Desc")}</p>

            {/* H3: Departure path no longer exposes the Internal toggle.
                Same-branch behaviour is suppressed; cross-branch internal
                moves should be recorded as Inter-Branch Transfer instead. */}
            {formData.movementType === "out" && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, destinationType: 'external', toLocationId: null, toAreaId: null, toUnitId: null, connectedTenantId: null })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                      formData.destinationType === 'external'
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {t("movement.destination.external")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canSendConnected) return;
                      setFormData({ ...formData, destinationType: 'connected', toLocationId: null, toAreaId: null, toUnitId: null, toExternalLocationId: null });
                    }}
                    aria-disabled={!canSendConnected}
                    title={!canSendConnected ? t("movement.connected.noPermission") : undefined}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                      formData.destinationType === 'connected'
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                      !canSendConnected && "opacity-50 cursor-not-allowed hover:border-border"
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t("movement.destination.connected")}
                    {canSendConnected && connectedDestinations.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                        {connectedDestinations.length}
                      </Badge>
                    )}
                  </button>
                </div>
                {!canSendConnected && (
                  <p className="text-xs text-muted-foreground">
                    {t("movement.connected.noPermission")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("movement.transfer.departureUseTransferHint")}
                </p>
              </>
            )}
            
            {/* FROM Location — auto-filled for OUT/TRANSFER, read-only if resolved */}
            {(formData.movementType === "out" || formData.movementType === "transfer") && (
              <div className="space-y-2">
                <Label>{t("movement.form.fromLocation")}</Label>
                {formData.fromLocationId && selectedHorse?.current_location_id ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {activeLocations.find(l => l.id === formData.fromLocationId)?.name || ''}
                    </span>
                    <Badge variant="outline" className="text-xs ms-auto">{t("movement.arrival.autoDetected")}</Badge>
                  </div>
                ) : (
                  <Select
                    value={formData.fromLocationId || ""}
                    onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("movement.form.fromLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} {loc.city && `(${loc.city})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* To Location — Internal */}
            {(formData.movementType === "in" || formData.movementType === "transfer" || (formData.movementType === "out" && formData.destinationType === "internal")) && (
              <div className="space-y-2">
                <Label>{t("movement.form.toLocation")}</Label>
                <Select
                  value={formData.toLocationId || ""}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    toLocationId: value,
                    toAreaId: null,
                    toUnitId: null,
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("movement.form.toLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // AD-1 Pass 1.3: exclude the source location from the
                      // internal destination dropdown for out/transfer flows.
                      const excludeSource =
                        formData.movementType === "out" || formData.movementType === "transfer";
                      const opts = excludeSource && formData.fromLocationId
                        ? activeLocations.filter((l) => l.id !== formData.fromLocationId)
                        : activeLocations;
                      if (opts.length === 0) {
                        return (
                          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                            {t("movement.form.noOtherLocations")}
                          </div>
                        );
                      }
                      return opts.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} {loc.city && `(${loc.city})`}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* To Location — External */}
            {formData.movementType === "out" && formData.destinationType === "external" && (
              <div className="space-y-3">
                <Label>{t("movement.destination.externalLocation")}</Label>
                {!showNewExternal ? (
                  <>
                    <Select
                      value={formData.toExternalLocationId || ""}
                      onValueChange={(value) => setFormData({ ...formData, toExternalLocationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("movement.destination.selectExternal")} />
                      </SelectTrigger>
                      <SelectContent>
                        {externalLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.city && `(${loc.city})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 w-full"
                      onClick={() => setShowNewExternal(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("movement.destination.addNew")}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                    <Input
                      value={newExtName}
                      onChange={(e) => setNewExtName(e.target.value)}
                      placeholder={t("movement.destination.locationName")}
                    />
                    <Input
                      value={newExtCity}
                      onChange={(e) => setNewExtCity(e.target.value)}
                      placeholder={t("movement.destination.city")}
                    />
                    <Select value={newExtType} onValueChange={setNewExtType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['stable', 'clinic', 'venue', 'farm', 'other'].map(lt => (
                          <SelectItem key={lt} value={lt}>{t(`movement.destination.types.${lt}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setShowNewExternal(false); setNewExtName(''); setNewExtCity(''); setNewExtType('other'); }}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={!newExtName.trim() || isCreatingExternal}
                        onClick={async () => {
                          const created = await createExternalLocation({ name: newExtName.trim(), city: newExtCity.trim() || undefined, location_type: newExtType });
                          setFormData({ ...formData, toExternalLocationId: created.id });
                          setShowNewExternal(false);
                          setNewExtName(''); setNewExtCity(''); setNewExtType('other');
                        }}
                      >
                        {t("common.save")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Connected destination picker */}
            {formData.movementType === "out" && formData.destinationType === "connected" && (
              <div className="space-y-2">
                <Label>{t("movement.destination.connectedEntity")}</Label>
                {connectedDestinations.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-2">
                    <Link2 className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("movement.destination.noConnectedDestinations")}</p>
                    <p className="text-xs text-muted-foreground">{t("movement.destination.noConnectedDestinationsHint")}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 mt-1"
                      onClick={() => setShowPartnerRequest(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("movement.destination.requestPartnership")}
                    </Button>
                    <p className="text-[10px] text-muted-foreground pt-1">{t("movement.destination.orUseExternal")}</p>
                    {pendingOutboundRequests.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('movement.destination.pendingRequests')}</p>
                        {pendingOutboundRequests.map((req: any) => (
                          <div key={req.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="truncate">{req.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">{t('movement.destination.awaitingResponse')}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedDestinations.map((dest) => (
                      <button
                        key={dest.id}
                        onClick={() => setFormData({ ...formData, connectedTenantId: dest.id })}
                        className={cn(
                          "flex items-center gap-3 w-full p-3 rounded-lg border-2 transition-all text-start",
                          formData.connectedTenantId === dest.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Link2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{dest.tenant_name}</p>
                          {dest.tenant_type && (
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {t(`movement.destination.types.${dest.tenant_type}`)}
                            </Badge>
                          )}
                        </div>
                        {formData.connectedTenantId === dest.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* H3: same-branch transfer is now blocked. Show explanatory
                error so the user knows to use Housing Tasks instead. */}
            {formData.movementType === 'transfer' &&
              !!formData.fromLocationId &&
              !!formData.toLocationId &&
              formData.fromLocationId === formData.toLocationId && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">
                  {t("movement.transfer.sameBranchBlocked")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* === STEP: HOUSING === */}
        {step === "housing" && (
          <div className="space-y-3">
            <HousingSelector
              branchId={formData.movementType === 'transfer' && isSameBranchTransfer ? formData.fromLocationId : formData.toLocationId}
              selectedAreaId={formData.toAreaId}
              selectedUnitId={formData.toUnitId}
              onAreaChange={(areaId) =>
                setFormData(prev => ({ ...prev, toAreaId: areaId, toUnitId: null }))
              }
              onUnitChange={(unitId) =>
                setFormData(prev => ({ ...prev, toUnitId: unitId }))
              }
              onSkip={handleHousingSkip}
            />
            {formData.movementType === 'transfer' && !formData.toUnitId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t("movement.transfer.unitLater")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* === STEP: DETAILS === */}
        {step === "details" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step4Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step4Desc")}</p>

            {/* AD-1 Pass 2-C: explicit departure subtype picker.
                Only required when this OUT movement is not a connected
                transfer or an internal cross-branch transfer. */}
            {requiresDepartureSubtype && (
              <div className="space-y-2">
                <Label className="font-medium">
                  {t("movement.subtype.departureTypeLabel")}
                </Label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subtypeChoice: 'checkout_departure' })}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 text-start transition-all",
                      formData.subtypeChoice === 'checkout_departure'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t("movement.subtype.checkoutDeparture")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("movement.subtype.checkoutDepartureHint")}</p>
                    </div>
                    {formData.subtypeChoice === 'checkout_departure' && (
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subtypeChoice: 'temporary_out' })}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 text-start transition-all",
                      formData.subtypeChoice === 'temporary_out'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t("movement.subtype.temporaryOut")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("movement.subtype.temporaryOutHint")}</p>
                    </div>
                    {formData.subtypeChoice === 'temporary_out' && (
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                    )}
                  </button>
                </div>
                {!formData.subtypeChoice && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t("movement.subtype.chooseRequired")}
                  </p>
                )}
              </div>
            )}

            {formData.movementType === "out" && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="schedule-toggle" className="font-medium flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      {t("movement.lifecycle.scheduleForLater")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("movement.lifecycle.scheduleForLaterDesc")}
                    </p>
                  </div>
                  <Switch
                    id="schedule-toggle"
                    checked={scheduleForLater}
                    onCheckedChange={(checked) => {
                      setScheduleForLater(checked);
                      if (!checked) setScheduledAt('');
                    }}
                  />
                </div>
                {scheduleForLater && (
                  <div className="space-y-1.5">
                    <Label>{t("movement.lifecycle.scheduledDateTime")}</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Historical date — for IN and TRANSFER */}
            {formData.movementType !== "out" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {t("movement.form.movementDate")}
                </Label>
                <Input
                  type="datetime-local"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("housing.admissions.wizard.arrivalDateHint")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("movement.form.reason")}</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder={t("movement.form.reasonPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("movement.form.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("movement.form.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* === STEP: REVIEW === */}
        {step === "review" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step5Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step5Desc")}</p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {formData.movementType && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.movementType")}</span>
                  <MovementTypeBadge type={formData.movementType} />
                </div>
              )}
              
              {/* Horse info */}
              {arrivalSource === 'new_horse' ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.selectHorse")}</span>
                  <div className="text-end">
                    <span className="font-medium">{newHorse.name}</span>
                    <Badge variant="outline" className="text-xs ms-2 text-amber-600 border-amber-300">{t("movement.arrival.newLabel")}</Badge>
                  </div>
                </div>
              ) : selectedHorse ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.selectHorse")}</span>
                  <span className="font-medium">{selectedHorse.name}</span>
                </div>
              ) : null}

              {fromLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.fromLocation")}</span>
                  <span className="font-medium">{fromLocation.name}</span>
                </div>
              )}

              {toLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.toLocation")}</span>
                  <span className="font-medium">{toLocation.name}</span>
                </div>
              )}

              {connectedDest && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.destination.connectedEntity")}</span>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{connectedDest.tenant_name}</span>
                  </div>
                </div>
              )}

              {toExtLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.destination.externalLocation")}</span>
                  <span className="font-medium">{toExtLocation.name}</span>
                </div>
              )}

              {selectedArea && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.area")}</span>
                  <span className="font-medium">{selectedArea.name}</span>
                </div>
              )}

              {selectedUnit && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.unit")}</span>
                  <span className="font-medium">{selectedUnit.code}{selectedUnit.name ? ` - ${selectedUnit.name}` : ''}</span>
                </div>
              )}

              {scheduleForLater && scheduledAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    {t("movement.lifecycle.scheduledDateTime")}
                  </span>
                  <span className="font-medium">{new Date(scheduledAt).toLocaleString()}</span>
                </div>
              )}

              {formData.reason && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("movement.form.reason")}</span>
                  <span className="font-medium">{formData.reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Sticky navigation buttons */}
      <div className="shrink-0 pt-4 border-t space-y-3">
        {attempted && currentIssues.length > 0 && (
          <MissingRequirementsBar issues={currentIssues} attempted />
        )}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={effectiveSteps.indexOf(step) === 0 ? () => handleOpenChange(false) : handleBack}
            className="gap-1"
          >
            {effectiveSteps.indexOf(step) === 0 ? (
              t("common.cancel")
            ) : (
              <>
                {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {t("common.back")}
              </>
            )}
          </Button>

          {step === "review" ? (
            <Button onClick={handleSubmit} disabled={isRecording || isRecordingConnected || isSubmitting}>
              {t("common.confirm")}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-1">
              {t("common.next")}
              {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const handlePartnerRequest = async (recipientTenantId: string) => {
    try {
      await createConnection.mutateAsync({
        connectionType: 'b2b',
        recipientTenantId,
      });
      setShowPartnerRequest(false);
      toast.success(t("movement.destination.partnershipRequested"));
    } catch {
      // Error handled in mutation
    }
  };

  if (isMobile) {
    return (
      <>
        <SafeFormDrawer open={open} onOpenChange={handleOpenChange} isDirty={isDirty} drawerContentClassName="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t("movement.form.recordMovement")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            {content}
          </div>
        </SafeFormDrawer>
        <AddPartnerDialog
          open={showPartnerRequest}
          onOpenChange={setShowPartnerRequest}
          onSubmit={handlePartnerRequest}
          isLoading={createConnection.isPending}
          typeFilter={['stable', 'clinic']}
        />
      </>
    );
  }

  return (
    <>
      <SafeFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        isDirty={isDirty}
        className="sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("movement.form.recordMovement")}</DialogTitle>
        </DialogHeader>
        {content}
      </SafeFormDialog>
      <AddPartnerDialog
        open={showPartnerRequest}
        onOpenChange={setShowPartnerRequest}
        onSubmit={handlePartnerRequest}
        isLoading={createConnection.isPending}
        typeFilter={['stable', 'clinic']}
      />
    </>
  );
}
