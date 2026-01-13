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
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, FlaskConical, AlertCircle, Check, CreditCard, FileText, AlertTriangle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorses } from "@/hooks/useHorses";
import { useClients } from "@/hooks/useClients";
import { useLabSamples, type CreateLabSampleData, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabCredits } from "@/hooks/laboratory/useLabCredits";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";

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
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'billing', title: 'Credits', titleAr: 'الرصيد', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

interface FormData {
  horse_id: string;
  collection_date: Date;
  physical_sample_id: string;
  client_id: string;
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

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdSampleId, setCreatedSampleId] = useState<string | null>(null);
  const [skipCheckout, setSkipCheckout] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    horse_id: preselectedHorseId || retestOfSample?.horse_id || '',
    collection_date: new Date(),
    physical_sample_id: '',
    client_id: retestOfSample?.client_id || '',
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
      if (s.key === 'billing' && (!creditsEnabled || isFreeRetest)) return false;
      if (s.key === 'checkout' && !showCheckoutStep) return false;
      return true;
    });
  }, [creditsEnabled, isFreeRetest, showCheckoutStep]);

  // Build checkout line items from selected templates
  const checkoutLineItems = useMemo((): CheckoutLineItem[] => {
    const selectedTemplates = activeTemplates.filter(t => formData.template_ids.includes(t.id));
    
    if (selectedTemplates.length === 0) {
      return [{
        id: "sample-placeholder",
        description: t("laboratory.checkout.sampleFee"),
        quantity: 1,
        unit_price: null,
        total_price: 0,
        entity_type: "lab_sample",
        entity_id: createdSampleId || "",
      }];
    }

    return selectedTemplates.map(template => {
      const pricing = template.pricing as Record<string, unknown> | null;
      const basePrice = pricing && typeof pricing.base_price === "number" 
        ? pricing.base_price 
        : null;
      const currency = (pricing?.currency as string) || "SAR";
      
      return {
        id: template.id,
        description: template.name,
        description_ar: template.name_ar,
        quantity: 1,
        unit_price: basePrice,
        total_price: basePrice ?? 0,
        entity_type: "lab_template",
        entity_id: template.id,
      };
    });
  }, [formData.template_ids, activeTemplates, createdSampleId, t]);

  const hasMissingPrices = checkoutLineItems.some(item => item.unit_price === null);
  const checkoutTotal = checkoutLineItems.reduce((sum, item) => sum + (item.unit_price ?? 0), 0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setCreatedSampleId(null);
      setSkipCheckout(false);
      // For retests, copy templates from original sample
      const retestTemplateIds = retestOfSample?.templates?.map(t => t.template.id) || [];
      setFormData({
        horse_id: preselectedHorseId || retestOfSample?.horse_id || '',
        collection_date: new Date(),
        physical_sample_id: retestOfSample?.physical_sample_id ? `${retestOfSample.physical_sample_id}-R${(retestOfSample.retest_count || 0) + 1}` : '',
        client_id: retestOfSample?.client_id || '',
        notes: isRetest ? `Retest of sample ${retestOfSample?.physical_sample_id || retestOfSample?.id}` : '',
        template_ids: retestTemplateIds,
      });
    }
  }, [open, preselectedHorseId, retestOfSample, isRetest]);

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

  const createSampleAndOpenCheckout = async () => {
    if (!formData.horse_id) return;

    setLoading(true);
    try {
      const sampleData: CreateLabSampleData = {
        horse_id: formData.horse_id,
        collection_date: formData.collection_date.toISOString(),
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        client_id: formData.client_id || undefined,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        template_ids: formData.template_ids.length > 0 ? formData.template_ids : undefined,
      };

      const sample = await createSample(sampleData);
      
      if (sample) {
        setCreatedSampleId(sample.id);
        // If credits enabled and not a free retest, debit credits
        if (creditsEnabled && !isFreeRetest && sample.id) {
          await debitCredits(sample.id, 1);
        }
        // Open embedded checkout
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
    if (!formData.horse_id) return;

    setLoading(true);
    try {
      const sampleData: CreateLabSampleData = {
        horse_id: formData.horse_id,
        collection_date: formData.collection_date.toISOString(),
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        client_id: formData.client_id || undefined,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        template_ids: formData.template_ids.length > 0 ? formData.template_ids : undefined,
      };

      const sample = await createSample(sampleData);
      
      if (sample) {
        // If credits enabled and not a free retest, debit credits
        if (creditsEnabled && !isFreeRetest && sample.id) {
          await debitCredits(sample.id, 1);
        }
        
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
    if (!formData.horse_id) return;

    setLoading(true);
    try {
      const sampleData: CreateLabSampleData = {
        horse_id: formData.horse_id,
        collection_date: formData.collection_date.toISOString(),
        physical_sample_id: formData.physical_sample_id || generateSampleId(),
        client_id: formData.client_id || undefined,
        notes: formData.notes || undefined,
        related_order_id: relatedOrderId || undefined,
        retest_of_sample_id: retestOfSample?.id || undefined,
        status: 'draft',
        template_ids: formData.template_ids.length > 0 ? formData.template_ids : undefined,
      };

      const sample = await createSample(sampleData);
      
      if (sample) {
        // If credits enabled and not a free retest, debit credits
        if (creditsEnabled && !isFreeRetest && sample.id) {
          await debitCredits(sample.id, 1);
        }
        
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedHorse = horses.find(h => h.id === formData.horse_id);
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
      case 'basic':
        return !!formData.horse_id && !!formData.collection_date;
      case 'templates':
        return true; // Templates are optional
      case 'details':
        return true;
      case 'checkout':
        // Can proceed if skipping OR if prices are valid
        return skipCheckout || !requirePricesForCheckout || !hasMissingPrices;
      case 'billing':
        return !creditsEnabled || (wallet?.balance || 0) >= 1;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    const currentStep = effectiveSteps[step];
    
    switch (currentStep?.key) {
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
            
            <div className="space-y-2">
              <Label>{t("laboratory.createSample.horse")} *</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData({ ...formData, horse_id: value })}
                disabled={isRetest}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("laboratory.createSample.selectHorse")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="space-y-2">
              <Label>{t("laboratory.createSample.sampleId")}</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.physical_sample_id}
                  onChange={(e) => setFormData({ ...formData, physical_sample_id: e.target.value })}
                  placeholder={t("laboratory.createSample.autoGenerated")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, physical_sample_id: generateSampleId() })}
                >
                  {t("common.create")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("laboratory.createSample.autoGenerated")}
              </p>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("laboratory.createSample.client")}</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("laboratory.createSample.selectClient")} />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">{t("laboratory.createSample.noClient")}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                        {item.unit_price !== null ? `${item.total_price} SAR` : "—"}
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
        return (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{t("laboratory.credits.currentBalance")}</span>
                <Badge variant={wallet && wallet.balance > 0 ? "default" : "destructive"}>
                  {wallet?.balance || 0} {t("laboratory.credits.title")}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("laboratory.credits.sampleCost")}</span>
                  <span>1 {t("laboratory.credits.title")}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>{t("laboratory.credits.balanceAfter")}</span>
                  <span>{(wallet?.balance || 0) - 1} {t("laboratory.credits.title")}</span>
                </div>
              </div>
            </Card>

            {(!wallet || wallet.balance < 1) && (
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("laboratory.createSample.horse")}</span>
                <span className="font-medium">{selectedHorse?.name || t("common.unknown")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("laboratory.createSample.collectionDate")}</span>
                <span>{format(formData.collection_date, "PPP")}</span>
              </div>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRetest ? t("laboratory.createSample.createRetest") : t("laboratory.createSample.title")}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {effectiveSteps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < effectiveSteps.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      i < step ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mb-4">
            <h3 className="font-semibold">{effectiveSteps[step]?.title}</h3>
          </div>

          {/* Step Content */}
          <div className="min-h-[200px]">
            {renderStepContent()}
          </div>

          {/* Navigation - hide for checkout step (has its own buttons) */}
          {effectiveSteps[step]?.key !== 'checkout' && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={step === 0 ? () => onOpenChange(false) : handlePrevious}
                className="flex-1"
              >
                {step === 0 ? (
                  t("common.cancel")
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("common.back")}
                  </>
                )}
              </Button>
              
              {step < effectiveSteps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1"
                >
                  {t("common.next")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="flex-1"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("laboratory.createSample.createSample")}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Embedded Checkout Sheet */}
      {createdSampleId && (
        <EmbeddedCheckout
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          sourceType="lab_sample"
          sourceId={createdSampleId}
          initialLineItems={checkoutLineItems.map(item => ({
            ...item,
            entity_id: createdSampleId,
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
