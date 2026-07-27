import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { SharedDateField } from "@/components/ui/shared-date-field";
import { Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useClients } from "@/hooks/useClients";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { formatCurrency } from "@/lib/formatters";
import { EligibleInvoiceAccordionRow } from "./SelectedInvoiceController";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";

import {
  PaymentTenderEditor,
  makeInitialTenderRows,
  type TenderRow,
} from "./PaymentTenderEditor";
import { BilingualClientName } from "./BilingualClientName";



import {
  useEligibleClientInvoices,
  type EligibleInvoice,
} from "@/hooks/finance/useEligibleClientInvoices";
import {
  buildAllocationsPayload,
  countGeneratedRows,
  MAX_RPC_ALLOCATION_ROWS,
  proposeOldestFirst,
  toCents,
  type TenderRowInput,
  type InvoiceBucketBreakdown,
} from "@/lib/finance/multiInvoiceDistribution";
import { buildMultiInvoiceIdempotencyKey } from "@/lib/finance/multiInvoicePaymentFingerprint";
import { postPaymentSession } from "@/lib/finance/postPaymentSession";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { getRiyadhDateString } from "@/lib/finance/invoiceRpc";

const ERROR_TOKEN_KEYS: Record<string, string> = {
  FIN_IDEMPOTENCY_CONFLICT: "finance.payments.errors.idempotencyConflict",
  FIN_INVOICE_OVER_ALLOCATION: "finance.payments.errors.overAllocation",
  FIN_INVOICE_NOT_PAYABLE: "finance.payments.errors.notPayable",
  FIN_INVOICE_CROSS_CLIENT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CROSS_TENANT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CURRENCY_MISMATCH: "finance.payments.errors.crossClient",
  FIN_PAYMENT_ACCOUNT_MISSING: "finance.payments.errors.accountMissing",
  FIN_HORSE_ALLOCATION_REQUIRED: "finance.multiInvoicePayment.errors.notSupported",
  FIN_HORSE_ALLOCATION_MISMATCH: "finance.multiInvoicePayment.errors.notSupported",
  FIN_HORSE_NOT_ON_INVOICE: "finance.multiInvoicePayment.errors.notSupported",
  FIN_CLIENT_LEVEL_ALLOCATION_INVALID: "finance.multiInvoicePayment.errors.notSupported",
  FIN_ALLOCATION_HISTORY_UNRESOLVED: "finance.payments.errors.historyUnresolved",
  FIN_PERMISSION_DENIED: "finance.payments.errors.permissionDenied",
  FIN_UNAUTHENTICATED: "finance.payments.errors.permissionDenied",
  FIN_PAYMENT_METHOD_INVALID: "finance.payments.errors.methodInvalid",
  FIN_ALLOCATION_DUPLICATE: "finance.payments.errors.duplicateAllocation",
};

interface MultiInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Optional caller-preselected invoice ids (e.g. invoked from a client statement). */
  preselectedInvoiceIds?: string[];
  onSuccess?: () => void;
}

interface ResolvedComposition {
  isComplex: boolean;
  canPayHere: boolean;
  breakdown?: InvoiceBucketBreakdown;
  valid: boolean;
}

/**
 * Phase N+3 · Slice 3.1 — Multi-Invoice Client Payment.
 *
 * ONE client · MULTIPLE outstanding invoices · ONE atomic payment session.
 *
 * Reordered flow (Payment-first):
 *   Client summary → Payment Date → Payment Methods (tenders) →
 *   Total Payments → Eligible Invoice summary → Invoice selection & allocation
 *   → per-invoice complex allocation card → compact sticky footer.
 *
 * Complex invoices (multiple horses, or horse + client-level) render the
 * shared `PaymentAllocationEditor` inline through
 * `MultiInvoiceComplexAllocationCard`. Unsupported lab-horse-only invoices
 * block submission with a localized notice — the user unselects the invoice
 * to proceed.
 */
export function MultiInvoicePaymentDialog({
  open,
  onOpenChange,
  clientId,
  preselectedInvoiceIds,
  onSuccess,
}: MultiInvoicePaymentDialogProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const tenantCurrency = useTenantCurrency();
  const { clients } = useClients();
  const client = clients.find((c) => c.id === clientId) ?? null;

  const { invoices, isLoading } = useEligibleClientInvoices({
    clientId,
    currency: tenantCurrency,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [tenderRows, setTenderRows] = useState<TenderRow[]>(makeInitialTenderRows);
  const [paymentDate, setPaymentDate] = useState<string>(getRiyadhDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compositions, setCompositions] = useState<
    Record<string, ResolvedComposition>
  >({});
  const [detailsInvoiceId, setDetailsInvoiceId] = useState<string | null>(null);

  const idempotencyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  // Reset state whenever the dialog opens. (Client change is handled by the
  // caller remounting the dialog via key={clientId} — every state above is
  // reinitialised at mount.)
  useEffect(() => {
    if (!open) return;
    const preSet = new Set(preselectedInvoiceIds ?? []);
    setSelectedIds(preSet);
    setAmounts({});
    setTenderRows(makeInitialTenderRows());
    setPaymentDate(getRiyadhDateString());
    setCompositions({});
    idempotencyRef.current = null;
    setIsSubmitting(false);
  }, [open, preselectedInvoiceIds]);

  const currency = tenantCurrency;
  const fmt = (n: number) => formatCurrency(n, currency);

  const selectedInvoices: EligibleInvoice[] = useMemo(
    () => invoices.filter((i) => selectedIds.has(i.id)),
    [invoices, selectedIds],
  );

  const invoiceAmountsUnits: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of selectedInvoices) {
      const raw = parseFloat(amounts[inv.id] ?? "");
      map[inv.id] = Number.isFinite(raw) && raw > 0 ? raw : 0;
    }
    return map;
  }, [selectedInvoices, amounts]);

  const invoiceAllocationTotal = useMemo(
    () => Object.values(invoiceAmountsUnits).reduce((s, v) => s + v, 0),
    [invoiceAmountsUnits],
  );

  const tenderRowsNormalised: TenderRowInput[] = useMemo(() => {
    return tenderRows.map((r) => ({
      id: r.id,
      method: r.method,
      amount: (() => {
        const n = parseFloat(r.amount);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })(),
      reference: r.reference,
    }));
  }, [tenderRows]);

  const tenderTotal = useMemo(
    () => tenderRowsNormalised.reduce((s, r) => s + r.amount, 0),
    [tenderRowsNormalised],
  );
  const totalEligibleOutstanding = useMemo(
    () => invoices.reduce((s, i) => s + i.outstanding, 0),
    [invoices],
  );

  // Validation --------------------------------------------------------------
  const perInvoiceOverAllocation = selectedInvoices.filter(
    (i) => toCents(invoiceAmountsUnits[i.id] || 0) > toCents(i.outstanding),
  );
  const remainingToAllocateUnits = Math.max(
    0,
    Math.round((tenderTotal - invoiceAllocationTotal) * 100) / 100,
  );
  const overAllocationUnits = Math.max(
    0,
    Math.round((invoiceAllocationTotal - tenderTotal) * 100) / 100,
  );
  const paymentsExceedOutstandingUnits = Math.max(
    0,
    Math.round((tenderTotal - totalEligibleOutstanding) * 100) / 100,
  );
  const amountsBalanced =
    toCents(tenderTotal) === toCents(invoiceAllocationTotal) && tenderTotal > 0;
  const generatedRowCount = countGeneratedRows({
    invoiceAmountsUnits,
    tenderRows: tenderRowsNormalised,
  });
  const overRowCap = generatedRowCount > MAX_RPC_ALLOCATION_ROWS;
  const tooManySelected = selectedInvoices.length > MAX_RPC_ALLOCATION_ROWS;
  const paymentsExceedOutstanding = paymentsExceedOutstandingUnits > 0;

  const complexInvoiceGuards = useMemo(() => {
    let allCanPay = true;
    let allValid = true;
    for (const inv of selectedInvoices) {
      const c = compositions[inv.id];
      if (!c) {
        // Composition not resolved yet — block submit until it is.
        allValid = false;
        continue;
      }
      if (!c.canPayHere) allCanPay = false;
      if (c.isComplex && !c.valid) allValid = false;
    }
    return { allCanPay, allValid };
  }, [selectedInvoices, compositions]);

  const canSubmit =
    !!tenantId &&
    !!clientId &&
    !!currency &&
    selectedInvoices.length > 0 &&
    tenderTotal > 0 &&
    amountsBalanced &&
    perInvoiceOverAllocation.length === 0 &&
    !overRowCap &&
    !tooManySelected &&
    !paymentsExceedOutstanding &&
    complexInvoiceGuards.allCanPay &&
    complexInvoiceGuards.allValid &&
    !isSubmitting;

  // Actions -----------------------------------------------------------------
  function toggleInvoice(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    if (!next) {
      setAmounts((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
      setCompositions((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
    }
  }

  function distributeOldestFirst() {
    if (tenderTotal <= 0) return;
    const proposal = proposeOldestFirst(
      selectedInvoices.map((i) => ({
        invoiceId: i.id,
        outstanding: i.outstanding,
        dueDate: i.due_date,
        issueDate: i.issue_date,
        invoiceNumber: i.invoice_number,
      })),
      tenderTotal,
    );
    const asStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(proposal)) asStrings[k] = v > 0 ? v.toFixed(2) : "";
    setAmounts(asStrings);
  }

  const handleCompositionResolved = useCallback(
    (info: {
      invoiceId: string;
      isComplex: boolean;
      canPayHere: boolean;
      breakdown?: InvoiceBucketBreakdown;
      valid: boolean;
    }) => {
      setCompositions((prev) => {
        const existing = prev[info.invoiceId];
        if (
          existing &&
          existing.isComplex === info.isComplex &&
          existing.canPayHere === info.canPayHere &&
          existing.valid === info.valid &&
          JSON.stringify(existing.breakdown ?? null) ===
            JSON.stringify(info.breakdown ?? null)
        ) {
          return prev;
        }
        return {
          ...prev,
          [info.invoiceId]: {
            isComplex: info.isComplex,
            canPayHere: info.canPayHere,
            breakdown: info.breakdown,
            valid: info.valid,
          },
        };
      });
    },
    [],
  );

  async function handleSubmit() {
    if (!canSubmit || !tenantId || !clientId) return;
    setIsSubmitting(true);
    try {
      const invoiceOrder = selectedInvoices.map((i) => i.id);
      const bucketBreakdownByInvoice: Record<string, InvoiceBucketBreakdown | undefined> = {};
      for (const inv of selectedInvoices) {
        const c = compositions[inv.id];
        if (c?.isComplex && c.breakdown) {
          bucketBreakdownByInvoice[inv.id] = c.breakdown;
        }
      }
      const allocations = buildAllocationsPayload({
        invoiceOrder,
        invoiceAmountsUnits,
        tenderRows: tenderRowsNormalised,
        bucketBreakdownByInvoice,
      });
      const idempotencyKey = buildMultiInvoiceIdempotencyKey({
        tenantId,
        clientId,
        currency,
        paymentDate,
        allocations,
      });
      idempotencyRef.current = { key: idempotencyKey, fingerprint: idempotencyKey };

      const result = await postPaymentSession(tenantId, idempotencyKey, {
        payment_date: paymentDate,
        allocations,
      });
      if (!result.success) {
        const failure = result as { code: string; message: string };
        const key = ERROR_TOKEN_KEYS[failure.code] ?? "finance.payments.errors.unknown";
        toast({ title: t(key), variant: "destructive" });
        return;
      }
      toast({ title: t("finance.multiInvoicePayment.success") });
      invalidateFinanceQueries(queryClient, tenantId);
      onSuccess?.();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render ------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 md:p-5 pb-3 shrink-0 border-b">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base md:text-lg">
                {t("finance.multiInvoicePayment.title")}
              </DialogTitle>
              <DialogDescription className="min-w-0 mt-1">
                <span className="sr-only">
                  {t("finance.multiInvoicePayment.description")}
                </span>
                {client && (
                  <span className="flex items-baseline gap-1 min-w-0 text-foreground text-xs md:text-sm">
                    <BilingualClientName
                      client={client}
                      primaryClassName="font-medium"
                    />
                  </span>
                )}
              </DialogDescription>
            </div>

            {/* Slice 3.3.1 — four KPIs inside the sticky header */}
            <div
              data-testid="multi-invoice-header-kpis"
              className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:ms-auto shrink-0 pe-8 lg:pe-10"
            >
              {[
                {
                  testId: "kpi-eligible-invoices",
                  label: t("finance.multiInvoicePayment.summary.eligibleCount"),
                  value: String(invoices.length),
                },
                {
                  testId: "kpi-total-outstanding",
                  label: t("finance.multiInvoicePayment.summary.totalOutstanding"),
                  value: fmt(totalEligibleOutstanding),
                  ltr: true,
                },
                {
                  testId: "kpi-selected-invoices",
                  label: t("finance.multiInvoicePayment.summary.selectedCount"),
                  value: t("finance.multiInvoicePayment.pageIndicator")
                    .replace("{{current}}", String(selectedInvoices.length))
                    .replace("{{total}}", String(invoices.length)),
                },
                {
                  testId: "kpi-selected-outstanding",
                  label: t("finance.multiInvoicePayment.summary.selectedOutstanding"),
                  value: fmt(
                    selectedInvoices.reduce((s, i) => s + i.outstanding, 0),
                  ),
                  ltr: true,
                },
              ].map((cell) => (
                <div
                  key={cell.testId}
                  data-testid={cell.testId}
                  className="rounded-md border bg-muted/30 px-2.5 py-1.5 flex flex-col items-start min-w-[7rem]"
                >
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                    {cell.label}
                  </span>
                  <span
                    dir={cell.ltr ? "ltr" : undefined}
                    className="text-sm font-semibold tabular-nums mt-0.5"
                  >
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>



        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 1) Payment Date */}
          <div className="grid gap-2 md:flex md:items-end md:gap-4">
            <Label className="md:min-w-[8rem] text-xs">
              {t("finance.payments.paymentDate")} <span aria-hidden="true">*</span>
            </Label>
            <SharedDateField
              value={paymentDate}
              onChange={(v) => setPaymentDate(v ?? getRiyadhDateString())}
              disabled={isSubmitting}
              className="flex-1"
              ariaLabel={t("finance.payments.paymentDate")}
            />
          </div>

          <Separator />

          {/* 2) Payment Methods (tenders) — precedes Invoice selection */}
          <PaymentTenderEditor
            rows={tenderRows}
            onChange={setTenderRows}
            disabled={isSubmitting}
          />

          {/* Total Payments summary */}
          <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t("finance.payments.totalPayment")}
            </span>
            <span dir="ltr" className="text-base font-bold tabular-nums">
              {fmt(tenderTotal)}
            </span>
          </div>

          <Separator />

          {/* 3) Eligible Invoices — Accordion (Slice 3.2) */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-sm font-semibold">
                {t("finance.multiInvoicePayment.eligibleInvoices")}
              </Label>
              {selectedInvoices.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={distributeOldestFirst}
                  disabled={tenderTotal <= 0 || isSubmitting}
                >
                  {t("finance.multiInvoicePayment.distributeOldestFirst")}
                </Button>
              )}
            </div>



            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("finance.multiInvoicePayment.noEligibleInvoices")}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <EligibleInvoiceAccordionRow
                    key={inv.id}
                    invoice={inv}
                    selected={selectedIds.has(inv.id)}
                    amount={amounts[inv.id] ?? ""}
                    currency={currency}
                    allocationEnabled={tenderTotal > 0}
                    disabled={isSubmitting}
                    onToggle={(next) => toggleInvoice(inv.id, next)}
                    onAmountChange={(next) =>
                      setAmounts((p) => ({ ...p, [inv.id]: next }))
                    }
                    onResolved={handleCompositionResolved}
                    onOpenDetails={(id) => setDetailsInvoiceId(id)}
                  />

                ))}
              </div>
            )}
          </div>


          {/* Warnings */}
          {perInvoiceOverAllocation.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.perInvoiceOver")}
                <span className="ms-1 font-medium">
                  {perInvoiceOverAllocation.map((i) => i.invoice_number).join(", ")}
                </span>
              </AlertDescription>
            </Alert>
          )}
          {overAllocationUnits > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.overAllocationBy")}:{" "}
                <span dir="ltr" className="font-mono tabular-nums">
                  {fmt(overAllocationUnits)}
                </span>
              </AlertDescription>
            </Alert>
          )}
          {paymentsExceedOutstanding && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.paymentsExceedOutstandingBy")}:{" "}
                <span dir="ltr" className="font-mono tabular-nums">
                  {fmt(paymentsExceedOutstandingUnits)}
                </span>
              </AlertDescription>
            </Alert>
          )}
          {overRowCap && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.tooManyRows")}
                <span className="ms-1 tabular-nums" dir="ltr">
                  ({generatedRowCount} / {MAX_RPC_ALLOCATION_ROWS})
                </span>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sticky footer — compact single row */}
        <div className="border-t bg-background px-6 py-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.multiInvoicePayment.totalPayments")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(tenderTotal)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.multiInvoicePayment.allocatedToInvoicesShort")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(invoiceAllocationTotal)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {t("finance.multiInvoicePayment.remainingToAllocateShort")}
                </div>
                <div
                  dir="ltr"
                  className={`font-semibold tabular-nums ${
                    amountsBalanced ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {fmt(remainingToAllocateUnits)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t("finance.multiInvoicePayment.record")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      {/* Slice 3.3 · Checkpoint C — canonical Invoice Details Sheet reused
          from the near-page workspace via Radix Portal (sheet-over-dialog). */}
      <InvoiceDetailsSheet
        open={!!detailsInvoiceId}
        onOpenChange={(v) => {
          if (!v) setDetailsInvoiceId(null);
        }}
        invoiceId={detailsInvoiceId}
      />
    </Dialog>

  );
}
