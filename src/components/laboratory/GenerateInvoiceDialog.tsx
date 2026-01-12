import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import {
  useLabInvoiceDraft,
  type LabBillingSourceType,
  type LabBillingLineItem,
  type GenerateInvoiceInput,
  type ExistingInvoicesResult,
} from "@/hooks/laboratory/useLabInvoiceDraft";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import type { LabRequest } from "@/hooks/laboratory/useLabRequests";
import { FileText, Receipt, Loader2, User, DollarSign, AlertCircle, ExternalLink } from "lucide-react";

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: LabBillingSourceType;
  sample?: LabSample;
  request?: LabRequest;
}

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  sourceType,
  sample,
  request,
}: GenerateInvoiceDialogProps) {
  const { t, dir } = useI18n();
  const { clients, loading: clientsLoading } = useClients();
  const { templates } = useLabTemplates();
  const {
    canCreateInvoice,
    isGenerating,
    isChecking,
    getTemplatePrice,
    buildLineItemsFromSample,
    buildLineItemsFromRequest,
    generateInvoice,
    checkExistingInvoice,
    goToInvoice,
  } = useLabInvoiceDraft();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    sample?.client_id || ""
  );
  const [notes, setNotes] = useState("");
  const [manualPrices, setManualPrices] = useState<Record<number, number>>({});
  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoicesResult>([]);
  const [hasChecked, setHasChecked] = useState(false);

  // Get source ID
  const sourceId = sourceType === "lab_sample" ? sample?.id : request?.id;

  // Check for existing invoice when dialog opens
  useEffect(() => {
    if (open && sourceId && !hasChecked) {
      checkExistingInvoice(sourceType, sourceId).then((existing) => {
        setExistingInvoices(existing);
        setHasChecked(true);
      });
    }
    // Reset when dialog closes
    if (!open) {
      setHasChecked(false);
      setExistingInvoices([]);
      setManualPrices({});
      setNotes("");
    }
  }, [open, sourceType, sourceId, checkExistingInvoice, hasChecked]);

  // Build line items based on source type
  const lineItems: LabBillingLineItem[] = useMemo(() => {
    if (sourceType === "lab_sample" && sample) {
      return buildLineItemsFromSample(sample, templates);
    } else if (sourceType === "lab_request" && request) {
      return buildLineItemsFromRequest(request, 0);
    }
    return [];
  }, [sourceType, sample, request, templates, buildLineItemsFromSample, buildLineItemsFromRequest]);

  // Apply manual price overrides
  const adjustedLineItems = useMemo(() => {
    return lineItems.map((item, index) => {
      const manualPrice = manualPrices[index];
      if (manualPrice !== undefined) {
        return {
          ...item,
          unitPrice: manualPrice,
          total: manualPrice * item.quantity,
        };
      }
      return item;
    });
  }, [lineItems, manualPrices]);

  // Calculate totals
  const subtotal = adjustedLineItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal; // No tax in Phase 1

  // Get source info
  const sourceName =
    sourceType === "lab_sample"
      ? sample?.horse?.name || t("laboratory.samples.unknownHorse")
      : request?.horse?.name || t("laboratory.samples.unknownHorse");

  // Selected client
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handlePriceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setManualPrices((prev) => ({
      ...prev,
      [index]: numValue,
    }));
  };

  const handleSubmit = async () => {
    if (!sourceId || !selectedClientId || !selectedClient) return;

    const input: GenerateInvoiceInput = {
      clientId: selectedClientId,
      clientName: selectedClient.name,
      sourceType,
      sourceId,
      sourceName,
      lineItems: adjustedLineItems,
      notes: notes || undefined,
    };

    const invoiceId = await generateInvoice(input);
    if (invoiceId) {
      onOpenChange(false);
    }
  };

  const handleGoToInvoice = (invoiceId: string) => {
    goToInvoice(invoiceId);
    onOpenChange(false);
  };

  const isValid = selectedClientId && adjustedLineItems.length > 0;
  const hasExistingInvoices = existingInvoices.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t("laboratory.billing.generateInvoice")}
          </DialogTitle>
          <DialogDescription>
            {t("laboratory.billing.generateInvoiceDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state while checking - show skeleton for entire content */}
        {isChecking && !hasChecked ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-end gap-2 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Existing Invoice Alert - Single Invoice */}
              {existingInvoices.length === 1 && (
                <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    {t("laboratory.billing.invoiceExists")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <p className="mb-3">
                      {t("laboratory.billing.invoiceExistsDesc")} ({existingInvoices[0].invoiceNumber})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
                      onClick={() => handleGoToInvoice(existingInvoices[0].invoiceId)}
                    >
                      <ExternalLink className="h-4 w-4 me-2" />
                      {t("laboratory.billing.goToInvoice")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Multiple Invoices Alert */}
              {existingInvoices.length > 1 && (
                <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    {t("laboratory.billing.multipleInvoicesFound")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <p className="mb-3">
                      {t("laboratory.billing.chooseInvoice")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {existingInvoices.map((inv) => (
                        <Button
                          key={inv.invoiceId}
                          variant="outline"
                          size="sm"
                          className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
                          onClick={() => handleGoToInvoice(inv.invoiceId)}
                        >
                          <ExternalLink className="h-4 w-4 me-2" />
                          {inv.invoiceNumber}
                        </Button>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Source Info */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {sourceType === "lab_sample"
                        ? t("laboratory.billing.sourceSample")
                        : t("laboratory.billing.sourceRequest")}
                      :
                    </span>
                    <span>{sourceName}</span>
                    {sample?.physical_sample_id && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {sample.physical_sample_id}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Client Selection - disabled if existing invoices */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t("laboratory.billing.selectClient")}
                </Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  disabled={clientsLoading || hasExistingInvoices}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("laboratory.billing.selectClientPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {dir === "rtl" && client.name_ar
                          ? client.name_ar
                          : client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Line Items - disabled if existing invoices */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t("laboratory.billing.lineItems")}
                </Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {adjustedLineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("laboratory.billing.noItemsFound")}
                    </p>
                  ) : (
                    adjustedLineItems.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {dir === "rtl" && item.templateNameAr
                                  ? item.templateNameAr
                                  : item.templateName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("laboratory.billing.quantity")}: {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 text-end"
                                value={manualPrices[index] ?? item.unitPrice}
                                onChange={(e) =>
                                  handlePriceChange(index, e.target.value)
                                }
                                placeholder="0.00"
                                disabled={hasExistingInvoices}
                              />
                              <span className="text-xs text-muted-foreground w-12">
                                SAR
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("finance.invoices.subtotal")}</span>
                  <span className="font-mono">{subtotal.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t("finance.invoices.total")}</span>
                  <span className="font-mono">{total.toFixed(2)} SAR</span>
                </div>
              </div>

              {/* Notes - disabled if existing invoices */}
              <div className="space-y-2">
                <Label>{t("common.notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("laboratory.billing.notesPlaceholder")}
                  rows={2}
                  disabled={hasExistingInvoices}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isGenerating || !canCreateInvoice || hasExistingInvoices || isChecking}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 me-2" />
                    {t("laboratory.billing.createInvoice")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
