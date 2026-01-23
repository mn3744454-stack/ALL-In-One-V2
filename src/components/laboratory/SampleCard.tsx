import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SampleStatusBadge } from "./SampleStatusBadge";
import { SampleProgressStepper } from "./SampleProgressStepper";
import { TemplateDetailsDialog } from "./TemplateDetailsDialog";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import type { LabTemplate } from "@/hooks/laboratory/useLabTemplates";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { useTenantCapabilities } from "@/hooks/useTenantCapabilities";
import { 
  FlaskConical, 
  Calendar, 
  Play, 
  CheckCircle2, 
  XCircle,
  RotateCcw,
  FileText,
  AlertTriangle,
  Eye,
  Receipt,
  CreditCard
} from "lucide-react";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";
import type { BillingLinkKind } from "@/hooks/billing/useBillingLinks";

interface SampleCardProps {
  sample: LabSample;
  canManage: boolean;
  canCreateInvoice?: boolean;
  completedResultsCount?: number;
  onAccession?: () => void;
  onStartProcessing?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onRetest?: () => void;
  onClick?: () => void;
  onViewAllResults?: () => void;
  onGenerateInvoice?: () => void;
}

type BillingPolicy = "at_intake" | "at_completion" | "both";

export function SampleCard({
  sample,
  canManage,
  canCreateInvoice = false,
  completedResultsCount = 0,
  onAccession,
  onStartProcessing,
  onComplete,
  onCancel,
  onRetest,
  onClick,
  onViewAllResults,
  onGenerateInvoice,
}: SampleCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { hasPermission, isOwner } = usePermissions();
  const { getCapabilityForCategory } = useTenantCapabilities();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLinkKind, setCheckoutLinkKind] = useState<BillingLinkKind>("final");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Horse profile navigation - platform horses only
  const horseId = sample.horse?.id;
  const isPlatformHorse = !!horseId;
  const isManualEntry = !isPlatformHorse && !!sample.horse_name;
  
  const handleHorseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlatformHorse) {
      navigate(`/dashboard/horses/${horseId}`);
    }
  };

  // Get billing policy from tenant capabilities
  const labCapability = getCapabilityForCategory("laboratory");
  const config = labCapability?.config && typeof labCapability.config === "object" 
    ? (labCapability.config as Record<string, unknown>) 
    : {};
  const billingPolicy: BillingPolicy = (config.billing_policy as BillingPolicy) || "at_completion";
  const requirePricesForCheckout = config.require_prices_for_checkout !== false; // Default true

  // Permission-based billing access
  const canBill = isOwner || hasPermission("laboratory.billing.collect") || hasPermission("finance.payment.collect");

  // Build checkout line items from sample templates
  const checkoutItems = useMemo((): CheckoutLineItem[] => {
    if (!sample.templates || sample.templates.length === 0) {
      return [{
        id: sample.id,
        description: `Lab Sample ${sample.physical_sample_id || sample.id.slice(0, 8)}`,
        quantity: 1,
        unit_price: null, // No price available
        total_price: 0,
        entity_type: "lab_sample",
        entity_id: sample.id,
      }];
    }
    return sample.templates.map((st) => {
      // Try to get price from template.pricing.base_price
      const templatePricing = (st.template as any)?.pricing;
      const basePrice = templatePricing && typeof templatePricing === "object" 
        ? (templatePricing.base_price ?? null) 
        : null;
      const unitPrice = typeof basePrice === "number" ? basePrice : null;
      return {
        id: st.id,
        description: st.template?.name || "Lab Test",
        description_ar: st.template?.name_ar,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice !== null ? unitPrice : 0,
        entity_type: "lab_sample",
        entity_id: sample.id,
      };
    });
  }, [sample]);

  // Check for missing prices
  const hasMissingPrices = checkoutItems.some(item => item.unit_price === null);
  // Resolve horse name: prefer joined horse record, fall back to walk-in name
  const horseName = sample.horse?.name || sample.horse_name || t("laboratory.samples.unknownHorse");
  
  // Determine billability based on policy
  const isIntakeBillable = 
    (billingPolicy === "at_intake" || billingPolicy === "both") && 
    ["draft", "accessioned"].includes(sample.status);
  
  const isCompletionBillable = 
    (billingPolicy === "at_completion" || billingPolicy === "both") && 
    sample.status === "completed";
  
  const isBillable = isIntakeBillable || isCompletionBillable;
  const horseInitials = horseName.slice(0, 2).toUpperCase();

  // Template progress calculation
  const templateCount = sample.templates?.length || 0;
  const resultsCount = completedResultsCount;
  const hasTemplates = templateCount > 0;
  const isPartial = hasTemplates && resultsCount > 0 && resultsCount < templateCount;
  const isComplete = hasTemplates && resultsCount >= templateCount;
  const progressPercent = hasTemplates ? (resultsCount / templateCount) * 100 : 0;

  const handleOpenCheckout = (linkKind: BillingLinkKind) => {
    setCheckoutLinkKind(linkKind);
    setCheckoutOpen(true);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Daily Number Badge - prominent display */}
            {(sample as any).daily_number && (
              <div className="flex items-center justify-center min-w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                #{(sample as any).daily_number}
              </div>
            )}
            <div 
              className={isPlatformHorse ? "cursor-pointer group" : ""}
              onClick={isPlatformHorse ? handleHorseClick : undefined}
            >
              <Avatar className="h-10 w-10 transition-transform group-hover:scale-105">
                <AvatarImage src={sample.horse?.avatar_url || undefined} alt={horseName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {horseInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 
                  className={`font-semibold text-sm ${isPlatformHorse ? "cursor-pointer hover:text-primary hover:underline" : ""}`}
                  onClick={isPlatformHorse ? handleHorseClick : undefined}
                >
                  {horseName}
                </h3>
                {isManualEntry && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/50">
                    {t("laboratory.samples.manualEntry")}
                  </Badge>
                )}
              </div>
              {sample.physical_sample_id && (
                <p className="text-xs text-muted-foreground font-mono">
                  {sample.physical_sample_id}
                </p>
              )}
            </div>
          </div>
          <SampleStatusBadge status={sample.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Progress Stepper */}
        <SampleProgressStepper
          status={sample.status}
          receivedAt={sample.received_at}
          accessionedAt={(sample as any).accessioned_at}
          processingStartedAt={(sample as any).processing_started_at}
          completedAt={sample.completed_at}
          createdAt={sample.created_at}
        />

        {/* Templates Badges - RTL-aware alignment, clickable */}
        {sample.templates && sample.templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 rtl:justify-end">
            {sample.templates.map((st) => {
              // Guard against missing template data
              if (!st.template) return null;
              const templateName = st.template.name_ar || st.template.name || '';
              return (
                <Badge 
                  key={st.id} 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(st.template);
                    setTemplateDialogOpen(true);
                  }}
                >
                  <FileText className="h-3 w-3 me-1" />
                  {templateName}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Results Progress */}
        {hasTemplates && (sample.status === 'processing' || sample.status === 'completed') && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{t("laboratory.samples.resultsProgress")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {resultsCount}/{templateCount}
                </span>
                {isPartial && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t("laboratory.samples.partial")}
                  </Badge>
                )}
                {isComplete && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    {t("laboratory.samples.complete")}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            
            {/* View All Results Button */}
            {resultsCount > 0 && onViewAllResults && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAllResults();
                }}
              >
                <Eye className="h-3 w-3 me-1" />
                {t("laboratory.samples.viewAllResults")}
              </Button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(sample.collection_date), "MMM d, yyyy")}</span>
          </div>
          {sample.retest_count > 0 && (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              <span>{t("laboratory.samples.retestNumber").replace("{{count}}", String(sample.retest_count))}</span>
            </div>
          )}
        </div>
        {sample.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {sample.notes}
          </p>
        )}
      </CardContent>

      {/* Action Buttons - visible instead of dropdown */}
      {canManage && (
        <CardFooter className="pt-3 border-t flex flex-wrap gap-1.5 justify-end">
          {sample.status === 'draft' && onAccession && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onAccession(); }}
            >
              <FlaskConical className="h-3 w-3 me-1" />
              {t("laboratory.sampleActions.accession")}
            </Button>
          )}
          {sample.status === 'accessioned' && onStartProcessing && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onStartProcessing(); }}
            >
              <Play className="h-3 w-3 me-1" />
              {t("laboratory.sampleActions.startProcessing")}
            </Button>
          )}
          {sample.status === 'processing' && onComplete && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
            >
              <CheckCircle2 className="h-3 w-3 me-1" />
              {t("laboratory.sampleActions.complete")}
            </Button>
          )}
          {sample.status === 'completed' && sample.retest_count < 3 && onRetest && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onRetest(); }}
            >
              <RotateCcw className="h-3 w-3 me-1" />
              {t("laboratory.sampleActions.createRetest")}
            </Button>
          )}
          
          {/* Billing buttons */}
          {isIntakeBillable && canBill && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs text-primary"
              onClick={(e) => { e.stopPropagation(); handleOpenCheckout("deposit"); }}
              disabled={requirePricesForCheckout && hasMissingPrices}
            >
              <CreditCard className="h-3 w-3 me-1" />
              {t("laboratory.billing.collectIntake")}
            </Button>
          )}
          
          {isCompletionBillable && canBill && onGenerateInvoice && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs text-primary"
              onClick={(e) => { e.stopPropagation(); onGenerateInvoice(); }}
            >
              <Receipt className="h-3 w-3 me-1" />
              {t("laboratory.billing.generateInvoice")}
            </Button>
          )}
          {isCompletionBillable && canBill && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs text-primary"
              onClick={(e) => { e.stopPropagation(); handleOpenCheckout("final"); }}
              disabled={requirePricesForCheckout && hasMissingPrices}
            >
              <CreditCard className="h-3 w-3 me-1" />
              {t("laboratory.billing.collectFinal")}
            </Button>
          )}
          
          {!['completed', 'cancelled'].includes(sample.status) && onCancel && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
            >
              <XCircle className="h-3 w-3 me-1" />
              {t("laboratory.sampleActions.cancel")}
            </Button>
          )}
        </CardFooter>
      )}

      {/* Quick Checkout Sheet */}
      <EmbeddedCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        sourceType="lab_sample"
        sourceId={sample.id}
        initialLineItems={checkoutItems}
        linkKind={checkoutLinkKind}
        onComplete={() => setCheckoutOpen(false)}
        onCancel={() => setCheckoutOpen(false)}
      />

      {/* Template Details Dialog */}
      <TemplateDetailsDialog
        template={selectedTemplate}
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </Card>
  );
}
