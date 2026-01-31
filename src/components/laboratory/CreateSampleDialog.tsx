import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, FlaskConical, AlertCircle, Check, CreditCard, FileText, AlertTriangle, ShoppingCart, Users, User, UserPlus, UserX } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClientSelector } from "@/components/horses/orders/ClientSelector";
import { WalkInClientForm } from "./WalkInClientForm";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useHorses } from "@/hooks/useHorses";
import { useClients } from "@/hooks/useClients";
import { useLabSamples, type CreateLabSampleData, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabCredits } from "@/hooks/laboratory/useLabCredits";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { usePermissions } from "@/hooks/usePermissions";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";
import { HorseSelectionStep, type SelectedHorse } from "./HorseSelectionStep";
import { LabHorsePicker } from "./LabHorsePicker";

interface CreateSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedOrderId?: string;
  retestOfSample?: LabSample;
  preselectedHorseId?: string;
  onSuccess?: () => void;
}

type BillingPolicy = "at_intake" | "at_completion" | "both";

interface StepDef {
  key: string;
  title: string;
  titleAr: string;
  icon: React.ElementType;
  conditional?: boolean;
}

const ALL_STEPS: StepDef[] = [
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'billing', title: 'Credits', titleAr: 'الرصيد', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

type ClientMode = 'existing' | 'walkin' | 'none';

interface WalkInClientData {
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string;
}

interface FormData {
  selectedHorses: SelectedHorse[];
  collection_date: Date;
  daily_number: string;
  per_sample_daily_numbers: Record<number, string>; // Index -> daily number for multi-sample
  physical_sample_id: string;
  client_id: string;
  clientMode: ClientMode;
  walkInClient: WalkInClientData;
  notes: string;
  template_ids: string[];
}

export function CreateSampleDialog({
  open,
  onOpenChange,
  relatedOrderId,
  retestOfSample,
  preselectedHorseId,
  onSuccess,
}: CreateSampleDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const { clients } = useClients();
  const { createSample } = useLabSamples();
  const { wallet, creditsEnabled, debitCredits } = useLabCredits();
  const { activeTemplates, loading: templatesLoading } = useLabTemplates();
  const { getCapabilityForCategory } = useTenantCapabilities();
  const { hasPermission, isOwner } = usePermissions();
  const { isLabTenant, labMode } = useModuleAccess();
  
  // Lab tenants with full mode use lab_horses instead of stable horses
  const isPrimaryLabTenant = isLabTenant && labMode === 'full';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdSampleIds, setCreatedSampleIds] = useState<string[]>([]);
  const [skipCheckout, setSkipCheckout] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    selectedHorses: [],
    collection_date: new Date(),
    daily_number: '',
    per_sample_daily_numbers: {},
    physical_sample_id: '',
    client_id: retestOfSample?.client_id || '',
    clientMode: retestOfSample?.client_id ? 'existing' : 'none',
    walkInClient: { client_name: '', client_phone: '', client_email: '', notes: '' },
    notes: '',
    template_ids: [],
  });

  // Get billing policy from tenant capabilities
  const labCapability = getCapabilityForCategory("laboratory");
  const config = labCapability?.config && typeof labCapability.config === "object" 
    ? (labCapability.config as Record<string, unknown>) 
    : {};
  const billingPolicy: BillingPolicy = (config.billing_policy as BillingPolicy) || "at_completion";
  const requirePricesForCheckout = config.require_prices_for_checkout !== false;

  // Permission check for billing
  const canBill = isOwner || hasPermission("laboratory.billing.create") || hasPermission("finance.invoice.create");

  // Determine if checkout step should show
  const showCheckoutStep = 
    (billingPolicy === "at_intake" || billingPolicy === "both") && 
    canBill;

  // Determine if this is a free retest
  const isRetest = !!retestOfSample;
  const isFreeRetest = isRetest && retestOfSample.retest_count < 3;

  // Calculate effective steps
  const effectiveSteps = useMemo(() => {
    return ALL_STEPS.filter(s => {
      // For retests, skip horse selection (horse is already defined)
      if (s.key === 'horses' && isRetest) return false;
      if (s.key === 'billing' && (!creditsEnabled || isFreeRetest)) return false;
      if (s.key === 'checkout' && !showCheckoutStep) return false;
      return true;
    });
  }, [creditsEnabled, isFreeRetest, showCheckoutStep, isRetest]);

  // Build checkout line items from selected templates
  const checkoutLineItems = useMemo((): CheckoutLineItem[] => {
    const selectedTemplates = activeTemplates.filter(t => formData.template_ids.includes(t.id));
    const horseCount = formData.selectedHorses.length || 1;
    
    if (selectedTemplates.length === 0) {
      return [{
        id: "sample-placeholder",
        description: t("laboratory.checkout.sampleFee"),
        quantity: horseCount,
        unit_price: null,
        total_price: 0,
        entity_type: "lab_sample",
        entity_id: createdSampleIds[0] || "",
      }];
    }

    return selectedTemplates.map(template => {
      const pricing = template.pricing as Record<string, unknown> | null;
      const basePrice = pricing && typeof pricing.base_price === "number" 
        ? pricing.base_price 
        : null;
      
      return {
        id: template.id,
        description: template.name,
        description_ar: template.name_ar,
        quantity: horseCount,
        unit_price: basePrice,
        total_price: basePrice !== null ? basePrice * horseCount : 0,
        entity_type: "lab_template",
        entity_id: template.id,
      };
    });
  }, [formData.template_ids, formData.selectedHorses.length, activeTemplates, createdSampleIds, t]);

  const hasMissingPrices = checkoutLineItems.some(item => item.unit_price === null);
  const checkoutTotal = checkoutLineItems.reduce((sum, item) => sum + (item.unit_price !== null ? item.unit_price * item.quantity : 0), 0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setCreatedSampleIds([]);
      setSkipCheckout(false);
      // For retests, set up retest horse
      const retestTemplateIds = retestOfSample?.templates?.map(t => t.template.id) || [];
      
      // Build initial selected horses
      const initialHorses: SelectedHorse[] = [];
      if (preselectedHorseId) {
        const horse = horses.find(h => h.id === preselectedHorseId);
        if (horse) {
          initialHorses.push({
            horse_id: horse.id,
            horse_type: 'internal',
            horse_name: horse.name,
          });
        }
      } else if (retestOfSample?.horse_id) {
        // Internal horse retest
        const horse = horses.find(h => h.id === retestOfSample.horse_id);
        if (horse) {
          initialHorses.push({
            horse_id: horse.id,
            horse_type: 'internal',
            horse_name: horse.name,
          });
        }
      } else if (retestOfSample?.horse_name) {
        // Walk-in horse retest - prefill from original sample's inline data
        const horseMetadata = retestOfSample.horse_metadata as Record<string, unknown> | null;
        initialHorses.push({
          horse_id: undefined,
          horse_type: 'walk_in',
          horse_name: retestOfSample.horse_name,
          horse_data: {
            passport_number: retestOfSample.horse_external_id || undefined,
            microchip: (horseMetadata?.microchip as string) || undefined,
            breed: (horseMetadata?.breed as string) || undefined,
            color: (horseMetadata?.color as string) || undefined,
          },
        });
      }
      
      // Determine initial client mode based on retest or defaults
      const initialClientMode: ClientMode = retestOfSample?.client_id 
        ? 'existing' 
        : retestOfSample?.client_name 
          ? 'walkin' 
          : 'none';
      
      setFormData({
        selectedHorses: initialHorses,
        collection_date: new Date(),
        daily_number: '',
        per_sample_daily_numbers: {},
        physical_sample_id: retestOfSample?.physical_sample_id ? `${retestOfSample.physical_sample_id}-R${(retestOfSample.retest_count || 0) + 1}` : '',
        client_id: retestOfSample?.client_id || '',
        clientMode: initialClientMode,
        walkInClient: {
          client_name: retestOfSample?.client_name || '',
          client_phone: retestOfSample?.client_phone || '',
          client_email: retestOfSample?.client_email || '',
          notes: '',
        },
        notes: isRetest ? `Retest of sample ${retestOfSample?.physical_sample_id || retestOfSample?.id}` : '',
        template_ids: retestTemplateIds,
      });
    }
  }, [open, preselectedHorseId, retestOfSample, isRetest, horses]);

  const generateSampleId = () => {
    const prefix = 'LAB';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleNext = () => {
    if (step < effectiveSteps.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Build client data based on client mode
  const getClientData = (): { 
    client_id?: string; 
    client_name?: string | null; 
    client_phone?: string | null; 
    client_email?: string | null; 
    client_metadata?: { notes?: string };
  } => {
    if (formData.clientMode === 'existing' && formData.client_id) {
      return { client_id: formData.client_id };
    }
    if (formData.clientMode === 'walkin' && formData.walkInClient.client_name.trim()) {
      return {
        client_name: formData.walkInClient.client_name.trim(),
        client_phone: formData.walkInClient.client_phone.trim() || null,
        client_email: formData.walkInClient.client_email.trim() || null,
        client_metadata: formData.walkInClient.notes.trim() 
          ? { notes: formData.walkInClient.notes.trim() } 
          : undefined,
      };
    }
    // No client
    return {};
  };

  const createSamplesForAllHorses = async (): Promise<string[]> => {
    const createdIds: string[] = [];
    const horsesToProcess = formData.selectedHorses.length > 0 ? formData.selectedHorses : [];
    const clientData = getClientData();
    
    // For retests, use the original sample's horse
    if (horsesToProcess.length === 0 && isRetest && retestOfSample?.horse_id) {
      const sampleData: CreateLabSampleData = {
        horse_id: retestOfSample.horse_id,
        collection_date: formData.collection_date.toISOString(),
        daily_number: formData.daily_number ? parseInt(formData.daily_number, 10) : undefined,
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        ...clientData,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        template_ids: formData.template_ids.length > 0 ? formData.template_ids : undefined,
      };

      const sample = await createSample(sampleData);
      if (sample) {
        createdIds.push(sample.id);
        if (creditsEnabled && !isFreeRetest) {
          await debitCredits(sample.id, 1);
        }
      }
      return createdIds;
    }
    
    for (let i = 0; i < horsesToProcess.length; i++) {
      const selectedHorse = horsesToProcess[i];
      // Use per-sample daily number if set, otherwise fallback to base + index
      let dailyNumber: number | undefined;
      if (formData.per_sample_daily_numbers[i]) {
        dailyNumber = parseInt(formData.per_sample_daily_numbers[i], 10);
      } else if (formData.daily_number) {
        dailyNumber = parseInt(formData.daily_number, 10) + i;
      }
      
      // Build sample data based on horse type
      const sampleData: CreateLabSampleData = {
        // For lab_horse type, use lab_horse_id and also set horse_name for display
        lab_horse_id: selectedHorse.horse_type === 'lab_horse' ? selectedHorse.horse_id : undefined,
        // For internal horses, use horse_id FK
        horse_id: selectedHorse.horse_type === 'internal' ? selectedHorse.horse_id : undefined,
        // For walk-in and lab_horse, store name for display
        horse_name: (selectedHorse.horse_type === 'walk_in' || selectedHorse.horse_type === 'lab_horse') 
          ? selectedHorse.horse_name 
          : undefined,
        horse_external_id: selectedHorse.horse_type === 'walk_in' 
          ? selectedHorse.horse_data?.passport_number 
          : undefined,
        horse_metadata: selectedHorse.horse_type === 'walk_in' ? {
          microchip: selectedHorse.horse_data?.microchip,
          breed: selectedHorse.horse_data?.breed,
          color: selectedHorse.horse_data?.color,
        } : undefined,
        collection_date: formData.collection_date.toISOString(),
        daily_number: dailyNumber,
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        ...clientData,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        template_ids: formData.template_ids.length > 0 ? formData.template_ids : undefined,
      };

      const sample = await createSample(sampleData);
      
      if (sample) {
        createdIds.push(sample.id);
        if (creditsEnabled && !isFreeRetest) {
          await debitCredits(sample.id, 1);
        }
      }
    }
    
    return createdIds;
  };

  const createSampleAndOpenCheckout = async () => {
    if (formData.selectedHorses.length === 0 && !isRetest) return;

    setLoading(true);
    try {
      const sampleIds = await createSamplesForAllHorses();
      
      if (sampleIds.length > 0) {
        setCreatedSampleIds(sampleIds);
        setCheckoutOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutComplete = (invoiceId: string) => {
    setCheckoutOpen(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleSkipCheckout = async () => {
    if (formData.selectedHorses.length === 0 && !isRetest) return;

    setLoading(true);
    try {
      const sampleIds = await createSamplesForAllHorses();
      
      if (sampleIds.length > 0) {
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // If checkout step exists and not skipped, it was already handled
    // This is for the final review step
    if (formData.selectedHorses.length === 0 && !isRetest) return;

    setLoading(true);
    try {
      const sampleIds = await createSamplesForAllHorses();
      
      if (sampleIds.length > 0) {
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedTemplates = activeTemplates.filter(t => formData.template_ids.includes(t.id));

  const toggleTemplate = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      template_ids: prev.template_ids.includes(templateId)
        ? prev.template_ids.filter(id => id !== templateId)
        : [...prev.template_ids, templateId],
    }));
  };

  const canProceed = () => {
    const currentStep = effectiveSteps[step];
    switch (currentStep?.key) {
      case 'horses':
        return formData.selectedHorses.length > 0;
      case 'basic':
        return !!formData.collection_date;
      case 'templates':
        return true; // Templates are optional
      case 'details':
        // For walk-in client mode, require client_name
        if (formData.clientMode === 'walkin') {
          return formData.walkInClient.client_name.trim().length > 0;
        }
        return true;
      case 'checkout':
        // Can proceed if skipping OR if prices are valid
        return skipCheckout || !requirePricesForCheckout || !hasMissingPrices;
      case 'billing':
        return !creditsEnabled || (wallet?.balance || 0) >= formData.selectedHorses.length;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    const currentStep = effectiveSteps[step];
    
    switch (currentStep?.key) {
      case 'horses':
        return (
          <div className="space-y-4">
            {/* Lab tenants use LabHorsePicker instead of stable horses */}
            {isPrimaryLabTenant ? (
              <LabHorsePicker
                selectedHorses={formData.selectedHorses}
                onHorsesChange={(horses) => setFormData(prev => ({ ...prev, selectedHorses: horses }))}
              />
            ) : (
              <HorseSelectionStep
                selectedHorses={formData.selectedHorses}
                onHorsesChange={(horses) => setFormData(prev => ({ ...prev, selectedHorses: horses }))}
              />
            )}
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-4">
            {isRetest && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <FlaskConical className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {t("laboratory.createSample.creatingRetest")} #{(retestOfSample?.retest_count || 0) + 1}
                  {isFreeRetest && <Badge className="ms-2 bg-green-500">{t("laboratory.createSample.freeRetest")}</Badge>}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Show selected horses summary */}
            {formData.selectedHorses.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">{t("laboratory.createSample.horse")}</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.selectedHorses.map((horse, idx) => (
                    <Badge key={`${horse.horse_id || idx}-${idx}`} variant="secondary" className="text-xs">
                      {horse.horse_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("laboratory.createSample.collectionDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.collection_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {formData.collection_date
                      ? format(formData.collection_date, "PPP")
                      : t("laboratory.createSample.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.collection_date}
                    onSelect={(date) => date && setFormData({ ...formData, collection_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4">
              {/* Single daily number input or base number for sequential */}
              {formData.selectedHorses.length <= 1 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("laboratory.createSample.dailyNumber")}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={async () => {
                          const today = new Date();
                          const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                          const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
                          
                          const { data: samples } = await supabase
                            .from("lab_samples")
                            .select("daily_number")
                            .gte("collection_date", startOfDay)
                            .lte("collection_date", endOfDay)
                            .not("daily_number", "is", null)
                            .order("daily_number", { ascending: false })
                            .limit(1);
                          
                          const nextNumber = samples && samples.length > 0 && samples[0].daily_number 
                            ? samples[0].daily_number + 1 
                            : 1;
                          setFormData(prev => ({ ...prev, daily_number: String(nextNumber) }));
                        }}
                      >
                        {t("laboratory.createSample.useNext")}
                      </Button>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={formData.daily_number}
                      onChange={(e) => setFormData({ ...formData, daily_number: e.target.value })}
                      placeholder={t("laboratory.createSample.dailyNumberPlaceholder")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("laboratory.createSample.sampleId")}</Label>
                    <Input
                      value={formData.physical_sample_id}
                      onChange={(e) => setFormData({ ...formData, physical_sample_id: e.target.value })}
                      placeholder={t("laboratory.createSample.autoGenerated")}
                    />
                  </div>
                </div>
              ) : (
                /* Multi-sample: Per-horse daily number inputs */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("laboratory.createSample.perSampleDailyNumbers")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={async () => {
                        const today = new Date();
                        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
                        
                        const { data: samples } = await supabase
                          .from("lab_samples")
                          .select("daily_number")
                          .gte("collection_date", startOfDay)
                          .lte("collection_date", endOfDay)
                          .not("daily_number", "is", null)
                          .order("daily_number", { ascending: false })
                          .limit(1);
                        
                        const startNumber = samples && samples.length > 0 && samples[0].daily_number 
                          ? samples[0].daily_number + 1 
                          : 1;
                        
                        // Auto-fill sequential numbers for each horse
                        const perSampleNumbers: Record<number, string> = {};
                        formData.selectedHorses.forEach((_, idx) => {
                          perSampleNumbers[idx] = String(startNumber + idx);
                        });
                        setFormData(prev => ({ 
                          ...prev, 
                          daily_number: String(startNumber),
                          per_sample_daily_numbers: perSampleNumbers 
                        }));
                      }}
                    >
                      {t("laboratory.createSample.autoFillSequential")}
                    </Button>
                  </div>
                  
                  <div className="rounded-md border divide-y">
                    {formData.selectedHorses.map((horse, idx) => (
                      <div key={`${horse.horse_id || idx}-${idx}`} className="flex items-center gap-3 p-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{horse.horse_name}</span>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="1"
                            value={formData.per_sample_daily_numbers[idx] || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              per_sample_daily_numbers: {
                                ...prev.per_sample_daily_numbers,
                                [idx]: e.target.value
                              }
                            }))}
                            placeholder={`#${idx + 1}`}
                            className="h-8 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("laboratory.createSample.sampleId")}</Label>
                    <Input
                      value={formData.physical_sample_id}
                      onChange={(e) => setFormData({ ...formData, physical_sample_id: e.target.value })}
                      placeholder={t("laboratory.createSample.autoGenerated")}
                    />
                  </div>
                </div>
              )}
            </div>
        </div>
        );

      case 'templates':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("laboratory.createSample.selectTemplates")}</Label>
              {formData.template_ids.length > 0 && (
                <Badge variant="secondary">{formData.template_ids.length} {t("laboratory.createSample.selected")}</Badge>
              )}
            </div>
            
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeTemplates.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("laboratory.createSample.noTemplates")}
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[280px] rounded-md border p-2">
                <div className="space-y-1">
                  {activeTemplates.map((template) => {
                    const pricing = template.pricing as Record<string, unknown> | null;
                    const basePrice = pricing && typeof pricing.base_price === "number" 
                      ? pricing.base_price 
                      : null;
                    const currency = (pricing?.currency as string) || "SAR";
                    
                    return (
                      <div
                        key={template.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-12",
                          "hover:bg-accent",
                          formData.template_ids.includes(template.id) && "bg-primary/10 border border-primary/20"
                        )}
                        onClick={() => toggleTemplate(template.id)}
                      >
                        <Checkbox
                          checked={formData.template_ids.includes(template.id)}
                          onCheckedChange={() => toggleTemplate(template.id)}
                          className="min-h-5 min-w-5"
                        />
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {template.name_ar || template.name}
                          </div>
                          {template.name_ar && template.name && (
                            <div className="text-xs text-muted-foreground">{template.name}</div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.fields.length} {t("laboratory.createSample.fields")}
                            </Badge>
                            {basePrice !== null ? (
                              <Badge variant="secondary" className="text-xs">
                                {basePrice} {currency}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 me-1" />
                                {t("finance.pos.priceMissing")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            
            <p className="text-xs text-muted-foreground">
              {t("laboratory.createSample.templatesHint")}
            </p>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4 pb-24 lg:pb-0">
            {/* Client Mode Selector */}
            <div className="space-y-3">
              <Label>{t("laboratory.createSample.client")}</Label>
              <RadioGroup
                value={formData.clientMode}
                onValueChange={(value: ClientMode) => {
                  setFormData(prev => ({
                    ...prev,
                    clientMode: value,
                    // Clear other client data when switching modes
                    client_id: value === 'existing' ? prev.client_id : '',
                    walkInClient: value === 'walkin' 
                      ? prev.walkInClient 
                      : { client_name: '', client_phone: '', client_email: '', notes: '' },
                  }));
                }}
                className="flex flex-col gap-2"
              >
                {/* Existing Client Option */}
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <RadioGroupItem value="existing" id="client-existing" className="h-5 w-5" />
                  <Label htmlFor="client-existing" className="flex items-center gap-2 cursor-pointer font-normal">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.existing")}
                  </Label>
                </div>
                
                {/* Walk-in Client Option */}
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <RadioGroupItem value="walkin" id="client-walkin" className="h-5 w-5" />
                  <Label htmlFor="client-walkin" className="flex items-center gap-2 cursor-pointer font-normal">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.walkin")}
                  </Label>
                </div>
                
                {/* No Client Option */}
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <RadioGroupItem value="none" id="client-none" className="h-5 w-5" />
                  <Label htmlFor="client-none" className="flex items-center gap-2 cursor-pointer font-normal">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.none")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Existing Client Selector */}
            {formData.clientMode === 'existing' && (
              <div className="space-y-2">
                <ClientSelector
                  selectedClientId={formData.client_id || null}
                  onClientSelect={(clientId) => {
                    setFormData(prev => ({ ...prev, client_id: clientId || '' }));
                  }}
                  placeholder={t("laboratory.createSample.selectClient")}
                />
              </div>
            )}
            
            {/* Walk-in Client Form */}
            {formData.clientMode === 'walkin' && (
              <WalkInClientForm
                data={formData.walkInClient}
                onChange={(walkInClient) => setFormData(prev => ({ ...prev, walkInClient }))}
              />
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t("laboratory.createSample.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("laboratory.createSample.notesPlaceholder")}
                rows={4}
              />
            </div>
          </div>
        );

      case 'checkout':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{t("laboratory.checkout.title")}</h4>
              <Badge variant="outline">
                {checkoutTotal.toFixed(2)} SAR
              </Badge>
            </div>

            {hasMissingPrices && requirePricesForCheckout && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t("laboratory.checkout.missingPrices")}
                </AlertDescription>
              </Alert>
            )}

            <Card className="p-4">
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {checkoutLineItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <div>
                        <p className="text-sm font-medium">{item.description_ar || item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.unit_price !== null 
                            ? `${item.unit_price} SAR × ${item.quantity}`
                            : t("finance.pos.priceMissing")
                          }
                        </p>
                      </div>
                      <span className="font-semibold">
                        {item.unit_price !== null ? `${item.unit_price * item.quantity} SAR` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                <span>{t("finance.pos.cart.total")}</span>
                <span>{checkoutTotal.toFixed(2)} SAR</span>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSkipCheckout}
                disabled={loading}
              >
                {t("laboratory.checkout.skip")}
              </Button>
              <Button
                className="flex-1"
                onClick={createSampleAndOpenCheckout}
                disabled={loading || (requirePricesForCheckout && hasMissingPrices)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 me-2" />
                    {t("laboratory.checkout.collectNow")}
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'billing':
        const horsesCount = formData.selectedHorses.length || 1;
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{t("laboratory.credits.currentBalance")}</span>
                <Badge variant={wallet && wallet.balance >= horsesCount ? "default" : "destructive"}>
                  {wallet?.balance || 0} {t("laboratory.credits.title")}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("laboratory.credits.sampleCost")}</span>
                  <span>{horsesCount} {t("laboratory.credits.title")}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>{t("laboratory.credits.balanceAfter")}</span>
                  <span>{(wallet?.balance || 0) - horsesCount} {t("laboratory.credits.title")}</span>
                </div>
              </div>
            </Card>

            {(!wallet || wallet.balance < horsesCount) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("laboratory.credits.insufficientCredits")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">{t("laboratory.createSample.reviewTitle")}</h4>
            
            <Card className="p-4 space-y-3">
              <div className="border-b pb-3">
                <span className="text-muted-foreground text-sm">{t("laboratory.createSample.horse")}</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.selectedHorses.map((horse, idx) => {
                    const baseDailyNumber = formData.daily_number ? parseInt(formData.daily_number, 10) : undefined;
                    const dailyNumber = baseDailyNumber !== undefined ? baseDailyNumber + idx : undefined;
                    return (
                      <Badge key={`${horse.horse_id || idx}-${idx}`} variant="secondary" className="text-xs">
                        {dailyNumber !== undefined && <span className="font-bold me-1">#{dailyNumber}</span>}
                        {horse.horse_name}
                      </Badge>
                    );
                  })}
                  {formData.selectedHorses.length === 0 && isRetest && retestOfSample?.horse?.name && (
                    <Badge variant="secondary" className="text-xs">{retestOfSample.horse.name}</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("laboratory.createSample.collectionDate")}</span>
                <span>{format(formData.collection_date, "PPP")}</span>
              </div>
              {formData.daily_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("laboratory.createSample.dailyNumber")}</span>
                  <span className="font-mono">
                    {formData.selectedHorses.length > 1 
                      ? `#${formData.daily_number} - #${parseInt(formData.daily_number) + formData.selectedHorses.length - 1}`
                      : `#${formData.daily_number}`
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("laboratory.createSample.sampleId")}</span>
                <span className="font-mono text-sm">
                  {formData.physical_sample_id || t("laboratory.createSample.autoGenerated")}
                </span>
              </div>
              {selectedClient && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("laboratory.createSample.client")}</span>
                  <span>{selectedClient.name}</span>
                </div>
              )}
              {isRetest && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("laboratory.createSample.retestOf")}</span>
                  <span>{retestOfSample?.physical_sample_id}</span>
                </div>
              )}
              {relatedOrderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("laboratory.createSample.relatedOrder")}</span>
                  <span className="font-mono text-sm">{relatedOrderId.slice(0, 8)}...</span>
                </div>
              )}
              {selectedTemplates.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">{t("laboratory.createSample.selectedTemplates")}</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedTemplates.map(t => (
                      <Badge key={t.id} variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {t.name_ar || t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {formData.notes && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">{t("laboratory.createSample.notes")}</span>
                  <p className="text-sm mt-1">{formData.notes}</p>
                </div>
              )}
            </Card>

            {creditsEnabled && !isFreeRetest && (
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  {t("laboratory.createSample.creditDeduction")}
                </AlertDescription>
              </Alert>
            )}

            {isFreeRetest && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {t("laboratory.createSample.freeRetest")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {isRetest ? t("laboratory.createSample.createRetest") : t("laboratory.createSample.title")}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator - scrollable on mobile */}
          <div className="flex-shrink-0 overflow-x-auto scrollbar-hide py-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max px-2">
              {effectiveSteps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors",
                      i === step
                        ? "bg-primary text-primary-foreground"
                        : i < step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i < step ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : i + 1}
                  </div>
                  {i < effectiveSteps.length - 1 && (
                    <div
                      className={cn(
                        "w-4 sm:w-8 h-0.5 mx-0.5 sm:mx-1",
                        i < step ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mb-2 sm:mb-4 flex-shrink-0">
            <h3 className="font-semibold text-sm sm:text-base">
              {t(`laboratory.createSample.steps.${effectiveSteps[step]?.key}`)}
            </h3>
          </div>

          {/* Step Content - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-6">
            {renderStepContent()}
          </div>

          {/* Navigation - hide for checkout step (has its own buttons) */}
          {effectiveSteps[step]?.key !== 'checkout' && (
            <div className="flex-shrink-0 flex gap-2 sm:gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={step === 0 ? () => onOpenChange(false) : handlePrevious}
                className="flex-1"
                size="sm"
              >
                {step === 0 ? (
                  t("common.cancel")
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 me-1" />
                    {t("common.back")}
                  </>
                )}
              </Button>
              
              {step < effectiveSteps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1"
                  size="sm"
                >
                  {t("common.next")}
                  <ChevronRight className="h-4 w-4 ms-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="flex-1"
                  size="sm"
                >
                  {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {formData.selectedHorses.length > 1 
                    ? t("laboratory.createSample.createSamples") 
                    : t("laboratory.createSample.createSample")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Embedded Checkout Sheet */}
      {createdSampleIds.length > 0 && (
        <EmbeddedCheckout
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          sourceType="lab_sample"
          sourceId={createdSampleIds[0]}
          initialLineItems={checkoutLineItems.map(item => ({
            ...item,
            entity_id: createdSampleIds[0],
          }))}
          suggestedClientId={formData.client_id || undefined}
          linkKind="deposit"
          onComplete={handleCheckoutComplete}
          onCancel={() => {
            setCheckoutOpen(false);
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
