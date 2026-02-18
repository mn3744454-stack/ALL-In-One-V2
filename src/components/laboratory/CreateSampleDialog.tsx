import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, FlaskConical, AlertCircle, Check, CreditCard, FileText, AlertTriangle, ShoppingCart, Users, User, UserPlus, UserX, Receipt, X, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClientSelector } from "@/components/horses/orders/ClientSelector";
import { WalkInClientForm } from "./WalkInClientForm";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useHorses } from "@/hooks/useHorses";
import { useClients } from "@/hooks/useClients";
import { useLabSamples, type CreateLabSampleData, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabRequests, type LabRequest } from "@/hooks/laboratory/useLabRequests";
import { fetchTemplateIdsForServices } from "@/hooks/laboratory/useLabServiceTemplates";
import { useCreatePartyHorseLink } from "@/hooks/laboratory/usePartyHorseLinks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useLabCredits } from "@/hooks/laboratory/useLabCredits";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { usePermissions } from "@/hooks/usePermissions";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";
import { HorseSelectionStep, type SelectedHorse } from "./HorseSelectionStep";
import { LabHorsePicker } from "./LabHorsePicker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { formatCurrency } from "@/lib/formatters";

interface CreateSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedOrderId?: string;
  retestOfSample?: LabSample;
  preselectedHorseId?: string;
  onSuccess?: () => void;
  fromRequest?: LabRequest | null;
}

type BillingPolicy = "at_intake" | "at_completion" | "both";

interface StepDef {
  key: string;
  title: string;
  titleAr: string;
  icon: React.ElementType;
  conditional?: boolean;
}

// Steps for LAB tenants (6 steps - client first)
const LAB_STEPS: StepDef[] = [
  { key: 'client', title: 'Client', titleAr: 'العميل', icon: User },
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'billing', title: 'Invoice', titleAr: 'الفاتورة', icon: Receipt },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

// Steps for non-lab tenants (stable, clinic, etc.)
const STABLE_STEPS: StepDef[] = [
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'credits', title: 'Credits', titleAr: 'الرصيد', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

// Client mode for LAB tenants
type LabClientMode = 'registered' | 'new' | 'none';

// Client mode for non-lab tenants (backward compatible)
type StableClientMode = 'existing' | 'walkin' | 'none';

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
  per_sample_daily_numbers: Record<number, string>;
  physical_sample_id: string;
  client_id: string;
  clientMode: LabClientMode | StableClientMode;
  walkInClient: WalkInClientData;
  notes: string;
  template_ids: string[];
  // Per-horse template customization
  per_horse_templates: Record<number, string[]>;
  customize_templates_per_horse: boolean;
  // Invoice creation option
  create_invoice: boolean;
  // Reason for no client (LAB tenant only)
  no_client_reason: string;
  // Phase 7: Receive & Number Now
  receive_now: boolean;
}

export function CreateSampleDialog({
  open,
  onOpenChange,
  relatedOrderId,
  retestOfSample,
  preselectedHorseId,
  onSuccess,
  fromRequest,
}: CreateSampleDialogProps) {
  const { t } = useI18n();
  const { horses } = useHorses();
  const { clients, createClient, refresh: refreshClients } = useClients();
  const { createSample } = useLabSamples();
  const { updateRequest } = useLabRequests();
  const { wallet, creditsEnabled, debitCredits } = useLabCredits();
  const { activeTemplates, loading: templatesLoading } = useLabTemplates();
  const { getCapabilityForCategory } = useTenantCapabilities();
  const { hasPermission, isOwner } = usePermissions();
  const { isLabTenant, labMode } = useModuleAccess();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  
  // Lab tenants with full mode use lab_horses instead of stable horses
  const isPrimaryLabTenant = isLabTenant && labMode === 'full';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdSampleIds, setCreatedSampleIds] = useState<string[]>([]);
  const [skipCheckout, setSkipCheckout] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  
  // Eager ensure state for request-origin fast path
  const requestPrefillResolvedRef = useRef(false);
  const [eagerResolvedClient, setEagerResolvedClient] = useState<{ id: string; name: string } | null>(null);
  const [eagerResolvedHorse, setEagerResolvedHorse] = useState<{ id: string; name: string } | null>(null);
  const [eagerResolving, setEagerResolving] = useState(false);
  
  const { mutateAsync: createPartyHorseLink } = useCreatePartyHorseLink();
  const queryClient = useQueryClient();
  
  // Billing step state: editable prices + Record Payment Now
  const [billingPrices, setBillingPrices] = useState<Record<string, number>>({});
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    selectedHorses: [],
    collection_date: new Date(),
    daily_number: '',
    per_sample_daily_numbers: {},
    physical_sample_id: '',
    client_id: retestOfSample?.client_id || '',
    clientMode: retestOfSample?.client_id ? 'registered' : 'none',
    walkInClient: { client_name: '', client_phone: '', client_email: '', notes: '' },
    notes: '',
    template_ids: [],
    per_horse_templates: {},
    customize_templates_per_horse: false,
    create_invoice: false,
    no_client_reason: '',
    receive_now: true,
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

  // Determine if checkout step should show (for non-lab tenants)
  const showCheckoutStep = 
    !isPrimaryLabTenant &&
    (billingPolicy === "at_intake" || billingPolicy === "both") && 
    canBill;

  // Determine if this is a free retest
  const isRetest = !!retestOfSample;
  const isFreeRetest = isRetest && retestOfSample.retest_count < 3;

  // Calculate effective steps based on tenant type
  const effectiveSteps = useMemo(() => {
    if (isPrimaryLabTenant) {
      // Lab tenant: use LAB_STEPS (6 steps with client first)
      return LAB_STEPS.filter(s => {
        // For retests, skip horse selection (horse is already defined)
        if (s.key === 'horses' && isRetest) return false;
        return true;
      });
    } else {
      // Non-lab tenant: use STABLE_STEPS
      return STABLE_STEPS.filter(s => {
        if (s.key === 'horses' && isRetest) return false;
        if (s.key === 'credits' && (!creditsEnabled || isFreeRetest)) return false;
        if (s.key === 'checkout' && !showCheckoutStep) return false;
        return true;
      });
    }
  }, [isPrimaryLabTenant, creditsEnabled, isFreeRetest, showCheckoutStep, isRetest]);

  /**
   * SMOKE TEST 1.1: Billing Step (Template × Horse)
   * 1. Create sample with 2 horses + 2 templates
   * 2. Go to billing step
   * 3. Expected: 4 line items (2 templates × 2 horses)
   * 4. Expected: Each shows "Template - HorseName"
   * 5. Edit a price value
   * 6. Expected: Total updates correctly
   * 7. Toggle "Create Invoice" ON, complete wizard
   * 8. Expected: Invoice created with edited prices
   */
  
  // Build checkout line items as Template × Horse matrix
  const checkoutLineItems = useMemo((): CheckoutLineItem[] => {
    const selectedTemplates = activeTemplates.filter(t => formData.template_ids.includes(t.id));
    const horses = formData.selectedHorses;
    
    if (selectedTemplates.length === 0) {
      const horseCount = horses.length || 1;
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

    // Generate per-horse items: Template × Horse matrix
    const items: CheckoutLineItem[] = [];
    for (const template of selectedTemplates) {
      const pricing = template.pricing as Record<string, unknown> | null;
      const basePrice = pricing && typeof pricing.base_price === "number" 
        ? pricing.base_price 
        : null;
      
      // If we have horses, create one item per horse
      if (horses.length > 0) {
        for (const horse of horses) {
          const itemKey = `${template.id}:${horse.horse_id || horse.horse_name}`;
          items.push({
            id: itemKey,
            description: `${template.name} - ${horse.horse_name}`,
            description_ar: template.name_ar 
              ? `${template.name_ar} - ${horse.horse_name}` 
              : undefined,
            quantity: 1,
            unit_price: basePrice,
            total_price: basePrice !== null ? basePrice : 0,
            entity_type: "lab_template",
            entity_id: template.id,
          });
        }
      } else {
        // No horses yet (retest or single sample)
        items.push({
          id: template.id,
          description: template.name,
          description_ar: template.name_ar,
          quantity: 1,
          unit_price: basePrice,
          total_price: basePrice !== null ? basePrice : 0,
          entity_type: "lab_template",
          entity_id: template.id,
        });
      }
    }
    
    return items;
  }, [formData.template_ids, formData.selectedHorses, activeTemplates, createdSampleIds, t]);

  const hasMissingPrices = checkoutLineItems.some(item => item.unit_price === null && !(item.id in billingPrices));
  
  // Calculate total using editable prices (billingPrices takes precedence)
  const checkoutTotal = checkoutLineItems.reduce((sum, item) => {
    const price = billingPrices[item.id] ?? item.unit_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  useEffect(() => {
    if (open) {
      // Fast-path: for request-origin samples, jump to Details step (index of 'details')
      const detailsStepIdx = fromRequest && isPrimaryLabTenant
        ? effectiveSteps.findIndex(s => s.key === 'details')
        : 0;
      setStep(detailsStepIdx >= 0 ? detailsStepIdx : 0);
      setCreatedSampleIds([]);
      setSkipCheckout(false);
      // Reset eager resolve state
      requestPrefillResolvedRef.current = false;
      setEagerResolvedClient(null);
      setEagerResolvedHorse(null);
      setEagerResolving(false);
      // Reset billing step state
      setBillingPrices({});
      setCreatedInvoiceId(null);
      setPaymentDialogOpen(false);
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
      } else if (fromRequest) {
        // Prefill from lab request snapshots (walk-in horse using snapshot data)
        const horseName = fromRequest.horse_name_snapshot || fromRequest.horse?.name || 'Unknown';
        const snapshot = fromRequest.horse_snapshot as Record<string, unknown> | null;
        initialHorses.push({
          horse_id: undefined,
          horse_type: 'walk_in',
          horse_name: horseName,
          horse_data: snapshot ? {
            breed: (snapshot.breed as string) || undefined,
            color: (snapshot.color as string) || undefined,
          } : undefined,
        });
      }
      
      // Determine initial client mode based on tenant type and retest/request
      const initialClientMode: LabClientMode | StableClientMode = isPrimaryLabTenant
        ? (retestOfSample?.client_id ? 'registered' : fromRequest ? 'registered' : 'none')
        : (retestOfSample?.client_id ? 'existing' : retestOfSample?.client_name ? 'walkin' : 'none');

      // Notes: prefill from request if applicable
      let initialNotes = '';
      if (isRetest) {
        initialNotes = `Retest of sample ${retestOfSample?.physical_sample_id || retestOfSample?.id}`;
      } else if (fromRequest) {
        initialNotes = fromRequest.test_description || '';
      }
      
      setFormData({
        selectedHorses: initialHorses,
        collection_date: new Date(),
        daily_number: '',
        per_sample_daily_numbers: {},
        physical_sample_id: retestOfSample?.physical_sample_id ? `${retestOfSample.physical_sample_id}-R${(retestOfSample.retest_count || 0) + 1}` : '',
        client_id: retestOfSample?.client_id || '',
        clientMode: initialClientMode,
        walkInClient: {
          client_name: fromRequest?.initiator_tenant_name_snapshot || retestOfSample?.client_name || '',
          client_phone: retestOfSample?.client_phone || '',
          client_email: retestOfSample?.client_email || '',
          notes: '',
        },
        notes: initialNotes,
        template_ids: retestTemplateIds,
        per_horse_templates: {},
        customize_templates_per_horse: false,
        create_invoice: false,
        no_client_reason: '',
        receive_now: fromRequest ? false : true, // Phase 7: default defer for request-origin
      });
    }
  }, [open, preselectedHorseId, retestOfSample, isRetest, horses, isPrimaryLabTenant, fromRequest]);

  // Phase 8: Ensure lab_horse exists for request-origin samples (UPSERT for concurrency safety)
  const ensureLabHorseForRequest = async (): Promise<string | null> => {
    if (!fromRequest?.horse_id || !activeTenant?.tenant.id || !user?.id) return null;
    
    const tenantId = activeTenant.tenant.id;
    const snapshot = fromRequest.horse_snapshot as Record<string, unknown> | null;
    
    const payload = {
      tenant_id: tenantId,
      created_by: user.id,
      name: fromRequest.horse_name_snapshot || fromRequest.horse?.name || 'Unknown',
      name_ar: fromRequest.horse_name_ar_snapshot || fromRequest.horse?.name_ar || null,
      breed_text: (snapshot?.breed as string) || null,
      color_text: (snapshot?.color as string) || null,
      linked_horse_id: fromRequest.horse_id,
      source: 'request' as const,
      owner_name: fromRequest.initiator_tenant_name_snapshot || null,
    };

    const { data: horse, error } = await supabase
      .from('lab_horses')
      .upsert(payload, { onConflict: 'tenant_id,linked_horse_id' })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to upsert lab horse for request:', error);
      return null;
    }
    return horse.id;
  };

  // Phase 12: Ensure client exists for request-origin samples
  const ensureClientForRequest = async (): Promise<string | null> => {
    if (!fromRequest || !isPrimaryLabTenant || !activeTenant?.tenant.id) return null;

    const tenantId = activeTenant.tenant.id;
    // Determine initiator tenant ID from the request
    const initiatorTenantId = (fromRequest as any).initiator_tenant_id;
    if (!initiatorTenantId) return null;

    const clientName = fromRequest.initiator_tenant_name_snapshot || 
      fromRequest.initiator_tenant?.name || 'Unknown Client';

    // Try upsert with linked_tenant_id dedup
    const { data: client, error } = await supabase
      .from('clients')
      .upsert(
        {
          tenant_id: tenantId,
          linked_tenant_id: initiatorTenantId,
          name: clientName,
          type: 'organization',
          status: 'active',
        },
        { onConflict: 'tenant_id,linked_tenant_id' }
      )
      .select('id, name')
      .single();

    if (error) {
      console.error('Failed to upsert client for request:', error);
      return null;
    }
    return client?.id || null;
  };

  // Eager ensure: resolve client + horse + junction link + templates on dialog open for request-origin
  useEffect(() => {
    if (!open || !fromRequest || !isPrimaryLabTenant || requestPrefillResolvedRef.current) return;
    if (!activeTenant?.tenant.id || !user?.id) return;
    
    requestPrefillResolvedRef.current = true;
    setEagerResolving(true);

    const tenantId = activeTenant.tenant.id;

    const resolve = async () => {
      let clientId: string | null = null;
      let labHorseId: string | null = null;

      // 1) Ensure client (skip gracefully if initiator_tenant_id missing)
      try {
        clientId = await ensureClientForRequest();
        if (clientId) {
          const clientName = fromRequest.initiator_tenant_name_snapshot || 
            fromRequest.initiator_tenant?.name || 'Client';
          setEagerResolvedClient({ id: clientId, name: clientName });
          setFormData(prev => ({ ...prev, client_id: clientId!, clientMode: 'registered' as LabClientMode }));
          // Force client registry to refetch so the new client appears in Clients tab and Step 1 picker
          refreshClients();
        }
      } catch (e) { console.error('Eager client ensure failed:', e); }

      // 2) Ensure lab horse (skip gracefully if horse_id missing)
      try {
        labHorseId = await ensureLabHorseForRequest();
        if (labHorseId) {
          const horseName = fromRequest.horse_name_snapshot || fromRequest.horse?.name || 'Horse';
          setEagerResolvedHorse({ id: labHorseId, name: horseName });
          // Hydrate wizard horse selection so Edit opens with horse selected
          setFormData(prev => ({
            ...prev,
            selectedHorses: [{
              horse_id: labHorseId!,
              horse_type: 'lab_horse' as const,
              horse_name: horseName,
            }],
          }));
          // Invalidate lab horses query so the horse appears in Lab Horse Registry and Step 2 picker
          queryClient.invalidateQueries({ queryKey: queryKeys.labHorses(tenantId) });
        }
      } catch (e) { console.error('Eager horse ensure failed:', e); }

      // 3) Create party_horse_links junction if both exist
      if (clientId && labHorseId) {
        try {
          await createPartyHorseLink({
            client_id: clientId,
            lab_horse_id: labHorseId,
            relationship_type: 'lab_customer',
            is_primary: true,
          });
          // Also invalidate party-horse links so horse filtering under client works
          queryClient.invalidateQueries({ queryKey: queryKeys.partyHorseLinks(tenantId) });
        } catch (e) { console.error('Party-horse link creation failed (may already exist):', e); }
      }

      // 4) Prefill templates from service↔template mapping
      try {
        const serviceIds = fromRequest.lab_request_services?.map(s => s.service_id) || [];
        if (serviceIds.length > 0) {
          const templateIds = await fetchTemplateIdsForServices(tenantId, serviceIds);
          if (templateIds.length > 0) {
            setFormData(prev => ({ ...prev, template_ids: templateIds }));
          }
        }
      } catch (e) { console.error('Template prefill failed:', e); }

      setEagerResolving(false);
    };

    resolve();
  }, [open, fromRequest, isPrimaryLabTenant, activeTenant?.tenant.id, user?.id]);

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
    // LAB tenant modes
    if (formData.clientMode === 'registered' && formData.client_id) {
      return { client_id: formData.client_id };
    }
    // Non-lab tenant modes (backward compatible)
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

  // Get templates for a specific horse (or global if not customized)
  const getTemplatesForHorse = (horseIndex: number): string[] => {
    if (formData.customize_templates_per_horse && formData.per_horse_templates[horseIndex]) {
      return formData.per_horse_templates[horseIndex];
    }
    return formData.template_ids;
  };

  const createSamplesForAllHorses = async (): Promise<string[]> => {
    const createdIds: string[] = [];
    const horsesToProcess = formData.selectedHorses.length > 0 ? formData.selectedHorses : [];
    const clientData = getClientData();

    // Phase 7: Determine status and numbering_deferred based on receive_now
    const sampleStatus: CreateLabSampleData['status'] = 
      (isPrimaryLabTenant && formData.receive_now) ? 'accessioned' : 'draft';
    const numberingDeferred = isPrimaryLabTenant ? !formData.receive_now : undefined;

    // Use eagerly resolved IDs from the request fast-path (already ensured on dialog open)
    const ensuredLabHorseId: string | null = eagerResolvedHorse?.id || null;

    // Use eagerly resolved client if not already set
    if (fromRequest && isPrimaryLabTenant && !clientData.client_id && eagerResolvedClient?.id) {
      clientData.client_id = eagerResolvedClient.id;
    }
    
    // For retests, use the original sample's horse (Phase 7: respect receive_now)
    if (horsesToProcess.length === 0 && isRetest && retestOfSample?.horse_id) {
      // Phase 7: Only compute daily numbers if receive_now is true
      let retestDailyNumber: number | undefined;
      if (formData.receive_now || !isPrimaryLabTenant) {
        if (formData.daily_number) {
          retestDailyNumber = parseInt(formData.daily_number, 10);
        }
      }

      const sampleData: CreateLabSampleData = {
        horse_id: retestOfSample.horse_id,
        collection_date: formData.collection_date.toISOString(),
        daily_number: retestDailyNumber,
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        ...clientData,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: sampleStatus,
        numbering_deferred: numberingDeferred,
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
      // Phase 7: Only compute daily numbers if receive_now is true
      let dailyNumber: number | undefined;
      if (formData.receive_now || !isPrimaryLabTenant) {
        if (formData.per_sample_daily_numbers[i]) {
          dailyNumber = parseInt(formData.per_sample_daily_numbers[i], 10);
        } else if (formData.daily_number) {
          dailyNumber = parseInt(formData.daily_number, 10) + i;
        }
      }

      // Get templates for this horse
      const horseTemplates = getTemplatesForHorse(i);

      // Phase 8: For request-origin samples, override with ensured lab_horse_id
      const effectiveLabHorseId = ensuredLabHorseId 
        || (selectedHorse.horse_type === 'lab_horse' ? selectedHorse.horse_id : undefined);
      
      // Build sample data based on horse type
      const sampleData: CreateLabSampleData = {
        // For lab_horse type, use lab_horse_id and also set horse_name for display
        lab_horse_id: effectiveLabHorseId,
        // For internal horses, use horse_id FK
        horse_id: (!effectiveLabHorseId && selectedHorse.horse_type === 'internal') ? selectedHorse.horse_id : undefined,
        // For walk-in and lab_horse, store name for display
        horse_name: (selectedHorse.horse_type === 'walk_in' || selectedHorse.horse_type === 'lab_horse' || ensuredLabHorseId) 
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
        status: sampleStatus,
        numbering_deferred: numberingDeferred,
        template_ids: horseTemplates.length > 0 ? horseTemplates : undefined,
        lab_request_id: fromRequest?.id || undefined,
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
        // Phase 5: Auto-update request status to 'processing' if created from a request
        if (fromRequest && (fromRequest.status === 'pending' || fromRequest.status === 'sent')) {
          try {
            await updateRequest({ id: fromRequest.id, status: 'processing' });
          } catch (e) {
            console.error('Failed to update request status:', e);
          }
        }

        // For LAB tenants, optionally create invoice
        if (isPrimaryLabTenant && formData.create_invoice && formData.client_id && canBill) {
          // Invoice creation will be handled by the calling component or a separate flow
        }
        
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle new client creation (LAB tenant only)
  const handleNewClientCreated = async (clientData: any) => {
    const newClient = await createClient(clientData);
    if (newClient) {
      setFormData(prev => ({
        ...prev,
        client_id: newClient.id,
        clientMode: 'registered' as LabClientMode,
      }));
      setClientFormOpen(false);
    }
    return newClient;
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

  const togglePerHorseTemplate = (horseIndex: number, templateId: string) => {
    setFormData(prev => {
      const current = prev.per_horse_templates[horseIndex] || [];
      const updated = current.includes(templateId)
        ? current.filter(id => id !== templateId)
        : [...current, templateId];
      return {
        ...prev,
        per_horse_templates: {
          ...prev.per_horse_templates,
          [horseIndex]: updated,
        },
      };
    });
  };

  const canProceed = () => {
    const currentStep = effectiveSteps[step];
    switch (currentStep?.key) {
      case 'client':
        // LAB tenant: enforce client selection or reason
        if (isPrimaryLabTenant) {
          if (formData.clientMode === 'none') {
            // Require reason for no client (min 5 chars)
            return formData.no_client_reason.trim().length >= 5;
          }
          if (formData.clientMode === 'registered') {
            return !!formData.client_id;
          }
          if (formData.clientMode === 'new') {
            return !!formData.client_id;
          }
          return false;
        }
        return true;
      case 'horses':
        return formData.selectedHorses.length > 0;
      case 'basic':
        return !!formData.collection_date;
      case 'templates':
        return true; // Templates are optional
      case 'details':
        // For non-lab tenants with walk-in client mode, require client_name
        if (!isPrimaryLabTenant && formData.clientMode === 'walkin') {
          return formData.walkInClient.client_name.trim().length > 0;
        }
        return true;
      case 'checkout':
        // Can proceed if skipping OR if prices are valid
        return skipCheckout || !requirePricesForCheckout || !hasMissingPrices;
      case 'credits':
        return !creditsEnabled || (wallet?.balance || 0) >= formData.selectedHorses.length;
      case 'billing':
        // LAB tenant billing step: always can proceed (invoice is optional)
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  // Render template checkbox list (reusable)
  const renderTemplateList = (
    selectedIds: string[],
    onToggle: (templateId: string) => void
  ) => (
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
                selectedIds.includes(template.id) && "bg-primary/10 border border-primary/20"
              )}
              onClick={() => onToggle(template.id)}
            >
              <Checkbox
                checked={selectedIds.includes(template.id)}
                onCheckedChange={() => onToggle(template.id)}
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
  );

  const renderStepContent = () => {
    const currentStep = effectiveSteps[step];
    
    switch (currentStep?.key) {
      // LAB TENANT: Client Step (Step 1)
      case 'client':
        return (
          <div className="space-y-3">
            <Label className="text-base font-medium">{t("laboratory.createSample.selectClient")}</Label>
            
            {/* Option 1: Registered Client */}
            <Collapsible open={formData.clientMode === 'registered'}>
              <div
                className={cn(
                  "flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-colors",
                  formData.clientMode === 'registered' && "bg-primary/5 border-primary/30"
                )}
                onClick={() => setFormData(prev => ({ ...prev, clientMode: 'registered' as LabClientMode, client_id: prev.client_id }))}
              >
                <div className={cn(
                  "h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0",
                  formData.clientMode === 'registered' ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {formData.clientMode === 'registered' && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.registered")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("laboratory.clientMode.registeredDesc")}
                  </p>
                </div>
              </div>
              <CollapsibleContent className="pt-2 ps-8">
                <ClientSelector
                  selectedClientId={formData.client_id || null}
                  onClientSelect={(clientId) => {
                    setFormData(prev => ({ ...prev, client_id: clientId || '' }));
                  }}
                  placeholder={t("laboratory.createSample.selectClient")}
                />
              </CollapsibleContent>
            </Collapsible>
            
            {/* Option 2: New Client */}
            <Collapsible open={formData.clientMode === 'new'}>
              <div
                className={cn(
                  "flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-colors",
                  formData.clientMode === 'new' && "bg-primary/5 border-primary/30"
                )}
                onClick={() => setFormData(prev => ({ ...prev, clientMode: 'new' as LabClientMode }))}
              >
                <div className={cn(
                  "h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0",
                  formData.clientMode === 'new' ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {formData.clientMode === 'new' && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.newClient")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("laboratory.clientMode.newClientDesc")}
                  </p>
                </div>
              </div>
              <CollapsibleContent className="pt-2 ps-8">
                {formData.client_id ? (
                  <div className="p-3 rounded-lg bg-accent border border-accent-foreground/10">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {t("laboratory.clientMode.clientCreated")}: {selectedClient?.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClientFormOpen(true)}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 me-2" />
                    {t("laboratory.clientMode.createNewClient")}
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
            
            {/* Option 3: No Client */}
            <Collapsible open={formData.clientMode === 'none'}>
              <div
                className={cn(
                  "flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-colors",
                  formData.clientMode === 'none' && "bg-primary/5 border-primary/30"
                )}
                onClick={() => setFormData(prev => ({ ...prev, clientMode: 'none' as LabClientMode, client_id: '' }))}
              >
                <div className={cn(
                  "h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0",
                  formData.clientMode === 'none' ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {formData.clientMode === 'none' && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    {t("laboratory.clientMode.none")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("laboratory.clientMode.noneDesc")}
                  </p>
                </div>
              </div>
              <CollapsibleContent className="pt-2 ps-8">
                <div className="space-y-2">
                  <Label htmlFor="no-client-reason" className="text-sm">
                    {t("laboratory.clientMode.noClientReason")} *
                  </Label>
                  <Textarea
                    id="no-client-reason"
                    value={formData.no_client_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, no_client_reason: e.target.value }))}
                    placeholder={t("laboratory.clientMode.noClientReasonPlaceholder")}
                    rows={2}
                    className="resize-none"
                  />
                  {formData.no_client_reason.length > 0 && formData.no_client_reason.length < 5 && (
                    <p className="text-xs text-destructive">
                      {t("common.minCharacters")}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );

      case 'horses':
        return (
          <div className="space-y-4">
            {/* Lab tenants use LabHorsePicker instead of stable horses */}
            {isPrimaryLabTenant ? (
              <LabHorsePicker
                selectedHorses={formData.selectedHorses}
                onHorsesChange={(horses) => setFormData(prev => ({ ...prev, selectedHorses: horses }))}
                clientId={formData.clientMode === 'registered' ? formData.client_id : undefined}
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

            {/* Per-horse customization toggle (only for multiple horses) */}
            {isPrimaryLabTenant && formData.selectedHorses.length > 1 && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch
                  checked={formData.customize_templates_per_horse}
                  onCheckedChange={(checked) => {
                    if (checked && formData.template_ids.length > 0) {
                      // Initialize per-horse templates with current global selection
                      const perHorse: Record<number, string[]> = {};
                      formData.selectedHorses.forEach((_, idx) => {
                        perHorse[idx] = [...formData.template_ids];
                      });
                      setFormData(prev => ({
                        ...prev,
                        customize_templates_per_horse: true,
                        per_horse_templates: perHorse,
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        customize_templates_per_horse: checked,
                      }));
                    }
                  }}
                />
                <Label className="cursor-pointer">
                  {t("laboratory.createSample.customizeTemplatesPerHorse")}
                </Label>
              </div>
            )}
            
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
            ) : formData.customize_templates_per_horse ? (
              // Per-horse template selection (Accordion)
              <Accordion type="single" collapsible className="w-full">
                {formData.selectedHorses.map((horse, idx) => {
                  const horseTemplates = formData.per_horse_templates[idx] || [];
                  return (
                    <AccordionItem key={`${horse.horse_id || idx}-${idx}`} value={`horse-${idx}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium">{horse.horse_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {horseTemplates.length} {t("laboratory.createSample.templates")}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderTemplateList(
                          horseTemplates,
                          (templateId) => togglePerHorseTemplate(idx, templateId)
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              // Global template selection
              renderTemplateList(formData.template_ids, toggleTemplate)
            )}
            
            <p className="text-xs text-muted-foreground">
              {t("laboratory.createSample.templatesHint")}
            </p>
          </div>
        );

      case 'details':
        // For LAB tenants, this step has receive_now choice + daily number + notes
        if (isPrimaryLabTenant) {
          return (
            <div className="space-y-4">
              {/* Phase 7: Receive & Number Now choice */}
              <div className="space-y-2">
                <Label className="text-base font-medium">{t("laboratory.createSample.receiveStatus")}</Label>
                <RadioGroup
                  value={formData.receive_now ? 'receive_now' : 'defer'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, receive_now: value === 'receive_now' }))}
                  className="flex flex-col gap-2"
                >
                  <div
                    className={cn(
                      "flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-colors",
                      formData.receive_now && "bg-primary/5 border-primary/30"
                    )}
                    onClick={() => setFormData(prev => ({ ...prev, receive_now: true }))}
                  >
                    <RadioGroupItem value="receive_now" id="receive-now" className="mt-0.5" />
                    <div>
                      <Label htmlFor="receive-now" className="cursor-pointer font-medium">
                        {t("laboratory.createSample.receiveNow")}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("laboratory.createSample.receiveNowDesc")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-colors",
                      !formData.receive_now && "bg-primary/5 border-primary/30"
                    )}
                    onClick={() => setFormData(prev => ({ ...prev, receive_now: false }))}
                  >
                    <RadioGroupItem value="defer" id="receive-defer" className="mt-0.5" />
                    <div>
                      <Label htmlFor="receive-defer" className="cursor-pointer font-medium">
                        {t("laboratory.createSample.deferNumbering")}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("laboratory.createSample.deferNumberingDesc")}
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Collection date */}
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

              {/* Daily number inputs - only shown when Receive Now is selected */}
              {formData.receive_now && (
                formData.selectedHorses.length <= 1 ? (
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
                          const collDate = formData.collection_date;
                          const startOfDay = new Date(collDate);
                          startOfDay.setHours(0, 0, 0, 0);
                          const endOfDay = new Date(collDate);
                          endOfDay.setHours(23, 59, 59, 999);
                          
                          const { data: samples } = await supabase
                            .from("lab_samples")
                            .select("daily_number")
                            .gte("collection_date", startOfDay.toISOString())
                            .lte("collection_date", endOfDay.toISOString())
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("laboratory.createSample.perSampleDailyNumbers")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={async () => {
                        const collDate = formData.collection_date;
                        const startOfDay = new Date(collDate);
                        startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(collDate);
                        endOfDay.setHours(23, 59, 59, 999);
                        
                        const { data: samples } = await supabase
                          .from("lab_samples")
                          .select("daily_number")
                          .gte("collection_date", startOfDay.toISOString())
                          .lte("collection_date", endOfDay.toISOString())
                          .not("daily_number", "is", null)
                          .order("daily_number", { ascending: false })
                          .limit(1);
                        
                        const startNumber = samples && samples.length > 0 && samples[0].daily_number 
                          ? samples[0].daily_number + 1 
                          : 1;
                        
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
                </div>
              )
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
        }

        // Non-LAB tenants: original details step with client selection
        return (
          <div className="space-y-4 pb-24 lg:pb-0">
            {/* Client Mode Selector */}
            <div className="space-y-3">
              <Label>{t("laboratory.createSample.client")}</Label>
              <RadioGroup
                value={formData.clientMode}
                onValueChange={(value: StableClientMode) => {
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

      // LAB TENANT: Billing/Invoice Step (Step 5)
      // SMOKE TEST 1.1: Billing step with Template × Horse, editable prices, Record Payment Now
      case 'billing':
        if (isPrimaryLabTenant) {
          const canRecordPayment = isOwner || hasPermission("finance.payments.create");
          
          return (
            <div className="space-y-4">
              {/* Invoice created success state with Record Payment Now */}
              {createdInvoiceId ? (
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{t("laboratory.billing.invoiceCreatedSuccess")}</span>
                  </div>
                  {canRecordPayment && (
                    <Button 
                      onClick={() => setPaymentDialogOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <CreditCard className="h-4 w-4 me-2" />
                      {t("laboratory.billing.recordPaymentNow")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">{t("laboratory.createSample.createInvoice")}</Label>
                    <Switch
                      checked={formData.create_invoice}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, create_invoice: checked }))}
                    />
                  </div>
                  
                  {formData.create_invoice ? (
                    <Card className="p-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {t("laboratory.createSample.invoicePreview")}
                        </p>
                        
                        {/* Line items with editable prices - Template × Horse */}
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("common.description")}</TableHead>
                                <TableHead className="text-center w-16">{t("laboratory.billing.quantity")}</TableHead>
                                <TableHead className="text-end w-28">{t("finance.invoices.unitPrice")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {checkoutLineItems.map(item => {
                                const currentPrice = billingPrices[item.id] ?? item.unit_price ?? 0;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      {item.description_ar || item.description}
                                    </TableCell>
                                    <TableCell className="text-center">×{item.quantity}</TableCell>
                                    <TableCell className="text-end p-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-24 text-end h-8 ms-auto"
                                        value={currentPrice}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setBillingPrices(prev => ({ ...prev, [item.id]: val }));
                                        }}
                                        placeholder="0.00"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={2} className="font-bold">{t("common.total")}</TableCell>
                                <TableCell className="text-end font-bold font-mono" dir="ltr">
                                  {formatCurrency(checkoutTotal)}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </div>
                      
                      {/* Client info (auto-filled from Step 1) */}
                      {selectedClient && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{selectedClient.name}</span>
                        </div>
                      )}
                      
                      {/* No client warning */}
                      {!selectedClient && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {t("laboratory.createSample.noClientForInvoice")}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Missing prices warning - only if ALL prices are missing */}
                      {hasMissingPrices && checkoutTotal === 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t("laboratory.createSample.missingPricesWarning")}
                          </AlertDescription>
                        </Alert>
                      )}
                    </Card>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("laboratory.createSample.skipInvoiceInfo")}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
              
              {/* Record Payment Dialog */}
              {createdInvoiceId && (
                <RecordPaymentDialog
                  open={paymentDialogOpen}
                  onOpenChange={setPaymentDialogOpen}
                  invoiceId={createdInvoiceId}
                  onSuccess={() => {
                    setPaymentDialogOpen(false);
                    onOpenChange(false);
                    onSuccess?.();
                  }}
                />
              )}
            </div>
          );
        }
        
        // Non-lab tenant credits step (legacy)
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

      // Non-lab tenant credits step
      case 'credits':
        const creditsHorsesCount = formData.selectedHorses.length || 1;
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{t("laboratory.credits.currentBalance")}</span>
                <Badge variant={wallet && wallet.balance >= creditsHorsesCount ? "default" : "destructive"}>
                  {wallet?.balance || 0} {t("laboratory.credits.title")}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("laboratory.credits.sampleCost")}</span>
                  <span>{creditsHorsesCount} {t("laboratory.credits.title")}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>{t("laboratory.credits.balanceAfter")}</span>
                  <span>{(wallet?.balance || 0) - creditsHorsesCount} {t("laboratory.credits.title")}</span>
                </div>
              </div>
            </Card>

            {(!wallet || wallet.balance < creditsHorsesCount) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("laboratory.credits.insufficientCredits")}
                </AlertDescription>
              </Alert>
            )}
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

      case 'review':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">{t("laboratory.createSample.reviewTitle")}</h4>
            
            <Card className="p-4 space-y-3">
              {/* Client (LAB tenant) */}
              {isPrimaryLabTenant && selectedClient && (
                <div className="flex justify-between border-b pb-3">
                  <span className="text-muted-foreground">{t("laboratory.createSample.client")}</span>
                  <span className="font-medium">{selectedClient.name}</span>
                </div>
              )}
              
              <div className="border-b pb-3">
                <span className="text-muted-foreground text-sm">{t("laboratory.createSample.horse")}</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.selectedHorses.map((horse, idx) => {
                    const dailyNum = formData.per_sample_daily_numbers[idx] 
                      || (formData.daily_number ? String(parseInt(formData.daily_number, 10) + idx) : undefined);
                    return (
                      <Badge key={`${horse.horse_id || idx}-${idx}`} variant="secondary" className="text-xs">
                        {dailyNum && <span className="font-bold me-1">#{dailyNum}</span>}
                        {horse.horse_name}
                      </Badge>
                    );
                  })}
                  {formData.selectedHorses.length === 0 && isRetest && retestOfSample?.horse?.name && (
                    <Badge variant="secondary" className="text-xs">{retestOfSample.horse.name}</Badge>
                  )}
                </div>
              </div>
              {/* Phase 7: Receive status in review */}
              {isPrimaryLabTenant && (
                <div className="flex justify-between border-b pb-3">
                  <span className="text-muted-foreground">{t("laboratory.createSample.receiveStatus")}</span>
                  <Badge variant={formData.receive_now ? "default" : "secondary"}>
                    {formData.receive_now 
                      ? t("laboratory.createSample.willReceiveNow")
                      : t("laboratory.createSample.willDefer")
                    }
                  </Badge>
                </div>
              )}
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
              {!isPrimaryLabTenant && selectedClient && (
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
              {/* Invoice status (LAB tenant) */}
              {isPrimaryLabTenant && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("laboratory.createSample.invoiceStatus")}</span>
                    <Badge variant={formData.create_invoice ? "default" : "secondary"}>
                      {formData.create_invoice 
                        ? t("laboratory.createSample.willCreateInvoice")
                        : t("laboratory.createSample.noInvoice")
                      }
                    </Badge>
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

            {creditsEnabled && !isFreeRetest && !isPrimaryLabTenant && (
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
          {/* Compact Header: Title + Step Indicator in one row */}
          <DialogHeader className="flex-shrink-0 pb-2">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base sm:text-lg shrink-0">
                {isRetest ? t("laboratory.createSample.createRetest") : t("laboratory.createSample.title")}
              </DialogTitle>
              
              {/* Step Indicators - inline */}
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                {effectiveSteps.map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                        i === step
                          ? "bg-primary text-primary-foreground"
                          : i < step
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    {i < effectiveSteps.length - 1 && (
                      <div
                        className={cn(
                          "w-3 sm:w-4 h-0.5 mx-0.5",
                          i < step ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Step Title - below header */}
          <div className="text-center mb-2 flex-shrink-0 border-b pb-2">
            <h3 className="font-semibold text-sm">
              {t(`laboratory.createSample.steps.${effectiveSteps[step]?.key}`)}
            </h3>
          </div>

          {/* Step Content - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-6">
          {/* Fast-path summary cards for request-origin when at Details step or beyond */}
            {fromRequest && isPrimaryLabTenant && effectiveSteps[step]?.key !== 'client' && effectiveSteps[step]?.key !== 'horses' && effectiveSteps[step]?.key !== 'templates' && (
              <div className="space-y-2 mb-4">
                {eagerResolving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("laboratory.catalog.summaryAutoResolved")}
                  </div>
                )}
                {/* Client summary card */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-muted/30 min-h-[44px]">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("laboratory.catalog.summaryClient")}</p>
                    <p className="text-sm font-medium truncate">
                      {selectedClient?.name || eagerResolvedClient?.name || fromRequest.initiator_tenant_name_snapshot || t("laboratory.catalog.summaryNotAvailable")}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-xs"
                    disabled={eagerResolving}
                    onClick={() => { const idx = effectiveSteps.findIndex(s => s.key === 'client'); if (idx >= 0) setStep(idx); }}>
                    {t("laboratory.catalog.summaryEdit")}
                  </Button>
                </div>
                {/* Horse summary card */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-muted/30 min-h-[44px]">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("laboratory.catalog.summaryHorse")}</p>
                    <p className="text-sm font-medium truncate">
                      {formData.selectedHorses[0]?.horse_name || eagerResolvedHorse?.name || fromRequest.horse_name_snapshot || t("laboratory.catalog.summaryNotAvailable")}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-xs"
                    disabled={eagerResolving}
                    onClick={() => { const idx = effectiveSteps.findIndex(s => s.key === 'horses'); if (idx >= 0) setStep(idx); }}>
                    {t("laboratory.catalog.summaryEdit")}
                  </Button>
                </div>
                {/* Templates summary card */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-muted/30 min-h-[44px]">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t("laboratory.catalog.summaryTemplates")}</p>
                    <p className="text-sm font-medium truncate">
                      {formData.template_ids.length > 0 
                        ? `${formData.template_ids.length} ${t("common.selected").toLowerCase()}`
                        : t("laboratory.catalog.summaryNotAvailable")
                      }
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-xs"
                    disabled={eagerResolving}
                    onClick={() => { const idx = effectiveSteps.findIndex(s => s.key === 'templates'); if (idx >= 0) setStep(idx); }}>
                    {t("laboratory.catalog.summaryEdit")}
                  </Button>
                </div>
              </div>
            )}
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

      {/* Client Form Dialog (LAB tenant only) */}
      <ClientFormDialog
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        onSave={handleNewClientCreated}
      />

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
          onComplete={handleCheckoutComplete}
        />
      )}
    </>
  );
}
