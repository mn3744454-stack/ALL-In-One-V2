import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
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
import { useHorseMovements, type MovementType, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { useExternalLocations } from "@/hooks/movement/useExternalLocations";
import { useConnectedDestinations } from "@/hooks/movement/useConnectedDestinations";
import { useConnectedMovement } from "@/hooks/movement/useConnectedMovement";
import { useEligibleHorses } from "@/hooks/movement/useEligibleHorses";
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
}

type DestinationType = 'internal' | 'external' | 'connected';
type ArrivalSource = 'existing' | 'new_horse';

// Steps vary by movement type & arrival source
type Step = "type" | "arrival_source" | "horse" | "new_horse" | "location" | "housing" | "details" | "review";

export function RecordMovementDialog({
  open, onOpenChange, onSuccess,
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
  }>({
    movementType: null, horseId: null, destinationType: 'internal',
    fromLocationId: null, toLocationId: null,
    toExternalLocationId: null, fromExternalLocationId: null,
    connectedTenantId: null,
    toAreaId: null, toUnitId: null,
    reason: "", notes: "", internalLocationNote: "",
  });

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

  const canGoNext = () => {
    switch (step) {
      case "type":
        return !!formData.movementType;
      case "arrival_source":
        return !!arrivalSource;
      case "horse":
        return !!formData.horseId;
      case "new_horse":
        return !!newHorse.name.trim() && !!newHorse.gender;
      case "location":
        if (formData.destinationType === 'connected') {
          if (formData.movementType === 'out') return !!formData.fromLocationId && !!formData.connectedTenantId;
          return false;
        }
        if (formData.destinationType === 'external') {
          if (formData.movementType === 'out') return !!formData.fromLocationId && !!formData.toExternalLocationId;
          if (formData.movementType === 'in') return !!formData.toLocationId;
          return false;
        }
        if (formData.movementType === "in") return !!formData.toLocationId;
        if (formData.movementType === "out") return !!formData.fromLocationId;
        if (formData.movementType === "transfer") {
          if (!formData.fromLocationId || !formData.toLocationId) return false;
          return true;
        }
        return false;
      case "housing":
        return true;
      case "details":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
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
    setIsSubmitting(true);

    try {
      let horseId = formData.horseId;

      // If new horse, create it first with intake_draft status
      if (arrivalSource === 'new_horse' && !horseId) {
        if (!activeTenant?.tenant_id) return;
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
            tenant_id: activeTenant.tenant_id,
            status: 'intake_draft',
          })
          .select('id')
          .single();

        if (createError || !createdHorse) {
          toast.error(createError?.message || "Failed to create horse");
          return;
        }
        horseId = createdHorse.id;
        toast.success(t("movement.arrival.horseCreated").replace("{{name}}", newHorse.name));
      }

      if (!horseId) return;

    // Connected movement uses a separate RPC
    if (formData.destinationType === 'connected' && formData.connectedTenantId) {
      await recordConnectedMovement({
        horse_id: horseId,
        connected_tenant_id: formData.connectedTenantId,
        from_location_id: formData.fromLocationId,
        movement_at: scheduleForLater && scheduledAt ? scheduledAt : undefined,
        reason: formData.reason || undefined,
        notes: formData.notes || undefined,
      });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
      return;
    }

    const currentHorse = allHorses.find(h => h.id === horseId);
    const isScheduled = scheduleForLater && scheduledAt;
    
    const data: CreateMovementData = {
      horse_id: horseId,
      movement_type: formData.movementType,
      from_location_id: formData.fromLocationId,
      to_location_id: formData.toLocationId,
      from_area_id: currentHorse?.current_area_id || null,
      from_unit_id: currentHorse?.housing_unit_id || null,
      to_area_id: formData.toAreaId,
      to_unit_id: formData.toUnitId,
      movement_at: movementDate || undefined,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
      internal_location_note: formData.internalLocationNote || undefined,
      clear_housing: isScheduled ? false : formData.movementType === 'out',
      destination_type: formData.destinationType,
      from_external_location_id: formData.fromExternalLocationId,
      to_external_location_id: formData.toExternalLocationId,
      movement_status: isScheduled ? 'scheduled' : undefined,
      scheduled_at: isScheduled ? scheduledAt : undefined,
    };

    await recordMovement(data);
    onOpenChange(false);
    resetForm();
    onSuccess?.();
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
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
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

      {/* Step Content */}
      <div className="min-h-[300px]">
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
                    setFormData({ ...formData, movementType: type, horseId: null, fromLocationId: null });
                    setArrivalSource(null);
                  }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-start",
                    formData.movementType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    type === "in" ? "bg-emerald-100 text-emerald-600" :
                    type === "out" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  )}>
                    {type === "in" && <ArrowDownToLine className="h-6 w-6" />}
                    {type === "out" && <ArrowUpFromLine className="h-6 w-6" />}
                    {type === "transfer" && <ArrowLeftRight className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t(`movement.types.${type}`)}</p>
                  </div>
                  {formData.movementType === type && (
                    <Check className="h-5 w-5 text-primary" />
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

            <div className="max-h-[260px] overflow-y-auto space-y-2">
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
                      <p className="font-medium truncate">{horse.name}</p>
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
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("horses.wizard.horseName")} *</Label>
                  <Input
                    value={newHorse.name}
                    onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })}
                    placeholder={t("horses.wizard.horseName")}
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

            {/* Destination type toggle — show for OUT movements */}
            {formData.movementType === "out" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, destinationType: 'internal', toExternalLocationId: null, connectedTenantId: null })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                    formData.destinationType === 'internal'
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {t("movement.destination.internal")}
                </button>
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
                {canSendConnected && (
                  <button
                    onClick={() => setFormData({ ...formData, destinationType: 'connected', toLocationId: null, toAreaId: null, toUnitId: null, toExternalLocationId: null })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                      formData.destinationType === 'connected'
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t("movement.destination.connected")}
                    {connectedDestinations.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                        {connectedDestinations.length}
                      </Badge>
                    )}
                  </button>
                )}
              </div>
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
                    {activeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.city && `(${loc.city})`}
                      </SelectItem>
                    ))}
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
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
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

            {/* Same-branch transfer: use housing selector on next step instead of free text */}
            {isSameBranchTransfer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {t("movement.transfer.sameBranchHint")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* === STEP: HOUSING === */}
        {step === "housing" && (
          <HousingSelector
            branchId={formData.movementType === 'transfer' && isSameBranchTransfer ? formData.fromLocationId : formData.toLocationId}
            selectedAreaId={formData.toAreaId}
            selectedUnitId={formData.toUnitId}
            onAreaChange={(areaId) => setFormData({ ...formData, toAreaId: areaId })}
            onUnitChange={(unitId) => setFormData({ ...formData, toUnitId: unitId })}
            onSkip={handleHousingSkip}
          />
        )}

        {/* === STEP: DETAILS === */}
        {step === "details" && (
          <div className="space-y-4">
            <h3 className="font-medium text-center">{t("movement.wizard.step4Title")}</h3>
            <p className="text-sm text-muted-foreground text-center">{t("movement.wizard.step4Desc")}</p>
            
            {/* Schedule for later — only for OUT */}
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

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={effectiveSteps.indexOf(step) === 0}
          className="gap-1"
        >
          {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {t("common.back")}
        </Button>

        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={isRecording || isRecordingConnected}>
            {t("common.confirm")}
          </Button>
        ) : step === "housing" ? (
          <Button onClick={handleNext} className="gap-1">
            {t("common.next")}
            {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canGoNext()} className="gap-1">
            {t("common.next")}
            {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
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
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>{t("movement.form.recordMovement")}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("movement.form.recordMovement")}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
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
