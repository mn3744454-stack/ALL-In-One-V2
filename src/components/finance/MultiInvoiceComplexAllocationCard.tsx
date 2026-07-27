import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n";
import { useInvoicePriorAllocations } from "@/hooks/finance/useInvoicePriorAllocations";
import { PaymentAllocationEditor } from "./PaymentAllocationEditor";
import { CLIENT_LEVEL_BUCKET_KEY } from "@/lib/finance/allocationDistribution";
import type { EligibleInvoice } from "@/hooks/finance/useEligibleClientInvoices";
import type { InvoiceBucketBreakdown } from "@/lib/finance/multiInvoiceDistribution";

interface MultiInvoiceComplexAllocationCardProps {
  invoice: EligibleInvoice;
  paymentAmount: number;
  currency: string;
  disabled?: boolean;
  onResolved: (info: {
    invoiceId: string;
    isComplex: boolean;
    canPayHere: boolean;
    breakdown?: InvoiceBucketBreakdown;
    valid: boolean;
  }) => void;
}

/**
 * Per-selected-invoice child that owns the `useInvoicePriorAllocations` hook
 * call for a single invoice. Because the parent renders one instance per
 * selected invoice, the Hook remains unconditional in this child's scope —
 * Rules of Hooks are preserved even though the parent renders a variable
 * number of these children as the user selects/unselects invoices.
 *
 * Behaviour:
 * - Simple compositions (single canonical horse OR client-level only) →
 *   render nothing and report {isComplex:false, canPayHere:true, valid:true}.
 *   The parent's default payload path handles them; the server resolves the
 *   canonical scope.
 * - Multi-horse or horse+client-level → render the shared
 *   `PaymentAllocationEditor` inline and forward its bucket totals + validity.
 * - Unsupported lab-horse-only combinations (multi lab-horse or lab-horse
 *   mixed with horses/client-level) → render a destructive alert and report
 *   {canPayHere:false}. The parent blocks submission and hints the user to
 *   unselect this invoice.
 */
export function MultiInvoiceComplexAllocationCard({
  invoice,
  paymentAmount,
  currency,
  disabled,
  onResolved,
}: MultiInvoiceComplexAllocationCardProps) {
  const { t } = useI18n();
  const { data: composition, isLoading, error } = useInvoicePriorAllocations(invoice.id);

  const [bucketValues, setBucketValues] = useState<Record<string, string>>({});
  const [allocationValid, setAllocationValid] = useState(false);

  const isComplex = !!composition &&
    composition.hasHorseScoped &&
    (composition.distinctHorses > 1 || composition.hasClientLevel);
  const blockedLabHorse = !!composition?.hasUnsupportedLabHorse;

  const breakdown: InvoiceBucketBreakdown | undefined = useMemo(() => {
    if (!isComplex || !composition) return undefined;
    const horseAllocations = composition.buckets
      .filter((b) => b.kind === "horse")
      .map((b) => ({
        horseId: b.horseId!,
        amount: parseFloat(bucketValues[b.key] || "0") || 0,
      }))
      .filter((h) => h.amount > 0);
    const clientLevelAmount =
      parseFloat(bucketValues[CLIENT_LEVEL_BUCKET_KEY] || "0") || 0;
    return {
      invoiceId: invoice.id,
      clientLevelAmount,
      horseAllocations,
    };
  }, [isComplex, composition, bucketValues, invoice.id]);

  // Stable resolver — cache last-reported payload so we do not flood the parent.
  const lastRef = useRef<string>("");
  useEffect(() => {
    const canPayHere = !blockedLabHorse;
    const valid = !isComplex ? true : allocationValid;
    const payload = {
      invoiceId: invoice.id,
      isComplex,
      canPayHere,
      breakdown,
      valid,
    };
    const key = JSON.stringify({
      isComplex,
      canPayHere,
      valid,
      breakdown: breakdown ?? null,
    });
    if (key === lastRef.current) return;
    lastRef.current = key;
    onResolved(payload);
  }, [isComplex, blockedLabHorse, allocationValid, breakdown, invoice.id, onResolved]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>
          {t("finance.multiInvoicePayment.loadingComposition")}: {invoice.invoice_number}
        </span>
      </div>
    );
  }

  if (error || !composition) return null;

  if (blockedLabHorse) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">{invoice.invoice_number}:</span>{" "}
          {t("finance.multiInvoicePayment.errors.notSupported")}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isComplex) return null;

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/20">
      <div className="text-xs font-semibold text-primary">
        {t("finance.multiInvoicePayment.allocationForInvoice")}: {invoice.invoice_number}
      </div>
      <Separator />
      <PaymentAllocationEditor
        composition={composition}
        paymentAmount={paymentAmount}
        currency={currency}
        invoiceItems={[]}
        value={bucketValues}
        onChange={(v) => {
          if (disabled) return;
          setBucketValues(v);
        }}
        onValidityChange={setAllocationValid}
      />
    </div>
  );
}
