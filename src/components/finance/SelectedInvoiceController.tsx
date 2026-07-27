import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FinancialAmountInput } from "./FinancialAmountInput";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import type { EligibleInvoice } from "@/hooks/finance/useEligibleClientInvoices";
import {
  useInvoicePriorAllocations,
  type InvoiceBucket,
  type InvoiceCompositionSummary,
} from "@/hooks/finance/useInvoicePriorAllocations";

import {
  CLIENT_LEVEL_BUCKET_KEY,
  validateBucketAllocations,
} from "@/lib/finance/allocationDistribution";
import {
  largestRemainderSplit,
  toCents,
  fromCents,
  type InvoiceBucketBreakdown,
} from "@/lib/finance/multiInvoiceDistribution";

interface EligibleInvoiceAccordionRowProps {
  invoice: EligibleInvoice;
  selected: boolean;
  amount: string;
  currency: string;
  allocationEnabled: boolean;
  /**
   * Slice 3.3.2 — Payment remaining that can still be applied to THIS invoice
   * after accounting for allocations already committed to other selected
   * invoices. Powers the compact "Pay in Full / سداد بالكامل" action.
   */
  paymentAvailableForInvoice?: number;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
  onAmountChange: (next: string) => void;
  onResolved: (info: {
    invoiceId: string;
    isComplex: boolean;
    canPayHere: boolean;
    breakdown?: InvoiceBucketBreakdown;
    valid: boolean;
  }) => void;
  /** Slice 3.3 · Checkpoint C — open the canonical Invoice Details Sheet from this row. */
  onOpenDetails?: (invoiceId: string) => void;
}


function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const key = `finance.status.${status}`;
  const label = t(key);
  return (
    <Badge variant="outline" className="text-[10px] uppercase shrink-0">
      {label === key ? status : label}
    </Badge>
  );
}

/**
 * Slice 3.2 — one accordion row per eligible invoice.
 *
 * - Always mounted while the parent dialog is open.
 * - Calls `useInvoicePriorAllocations` unconditionally (Rules of Hooks safe).
 * - Composition query is disabled unless the row is selected OR expanded, so
 *   the dialog opens with zero composition queries.
 * - When selected AND `allocationEnabled` (Total Payments > 0), the row owns
 *   the automatic vs manual internal distribution for its invoice and emits
 *   the authoritative breakdown/validity to the parent via `onResolved`.
 * - Collapse/expand controls visibility only; it never affects the composition
 *   query timing or the emitted financial payload.
 */
export function EligibleInvoiceAccordionRow({
  invoice,
  selected,
  amount,
  currency,
  allocationEnabled,
  paymentAvailableForInvoice = 0,
  disabled,
  onToggle,
  onAmountChange,
  onResolved,
  onOpenDetails,
}: EligibleInvoiceAccordionRowProps) {

  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const fmt = (n: number) => formatCurrency(n, currency);

  const [expanded, setExpanded] = useState<string>("");
  const isOpen = expanded === invoice.id;

  const { data: composition, isLoading } = useInvoicePriorAllocations(invoice.id, {
    enabled: selected || isOpen,
  });

  const complexBuckets = useMemo<InvoiceBucket[]>(
    () => composition?.buckets ?? [],
    [composition],
  );
  const isComplex = !!composition &&
    composition.hasHorseScoped &&
    (composition.distinctHorses > 1 || composition.hasClientLevel);
  const blockedLabHorse = !!composition?.hasUnsupportedLabHorse;

  const [manualMode, setManualMode] = useState(false);
  const [bucketValues, setBucketValues] = useState<Record<string, string>>({});
  const [overMaxInvoice, setOverMaxInvoice] = useState(false);
  const [overMaxBuckets, setOverMaxBuckets] = useState<Record<string, boolean>>({});
  const paymentAmount = parseFloat(amount || "0") || 0;


  const remainingByBucketKey = useMemo(() => {
    const r: Record<string, number> = {};
    for (const b of complexBuckets) r[b.key] = b.remaining;
    return r;
  }, [complexBuckets]);

  // Automatic proposal — cap-aware largest-remainder split across buckets by
  // remaining. Runs on: amount change, composition arrival, or exit-manual.
  const autoProposal = useCallback(
    (units: number) => {
      const next: Record<string, string> = {};
      if (units <= 0 || complexBuckets.length === 0) return next;
      const capsCents = complexBuckets.map((b) => Math.max(0, toCents(b.remaining)));
      const weights = capsCents.slice();
      const targetCents = Math.min(
        toCents(units),
        capsCents.reduce((s, c) => s + c, 0),
      );
      const raw = largestRemainderSplit(targetCents, weights);
      // Clamp any bucket to its cap and redistribute residual to buckets with headroom.
      let overflow = 0;
      const assigned = raw.map((v, i) => {
        const cap = capsCents[i];
        if (v > cap) {
          overflow += v - cap;
          return cap;
        }
        return v;
      });
      let i = 0;
      while (overflow > 0 && i < 10_000) {
        let placed = false;
        for (let k = 0; k < assigned.length; k++) {
          const room = capsCents[k] - assigned[k];
          if (room > 0) {
            const give = Math.min(room, overflow);
            assigned[k] += give;
            overflow -= give;
            placed = true;
            if (overflow <= 0) break;
          }
        }
        if (!placed) break;
        i++;
      }
      for (let k = 0; k < complexBuckets.length; k++) {
        const cents = assigned[k];
        if (cents > 0) next[complexBuckets[k].key] = fromCents(cents).toFixed(2);
      }
      return next;
    },
    [complexBuckets],
  );

  // Re-run auto proposal whenever amount or composition changes and we are
  // in Automatic mode.
  useEffect(() => {
    if (!isComplex || manualMode || blockedLabHorse) return;
    if (paymentAmount <= 0) {
      setBucketValues({});
      return;
    }
    const proposal = autoProposal(paymentAmount);
    setBucketValues(proposal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentAmount, isComplex, manualMode, blockedLabHorse, composition]);

  // Reconcile invoice-level amount in Manual mode = sum of buckets.
  useEffect(() => {
    if (!manualMode) return;
    const sumCents = Object.values(bucketValues).reduce(
      (s, v) => s + toCents(parseFloat(v || "0") || 0),
      0,
    );
    const asStr = sumCents > 0 ? fromCents(sumCents).toFixed(2) : "";
    if (asStr !== amount) onAmountChange(asStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualMode, bucketValues]);

  // Emit resolved breakdown/validity upward.
  const lastRef = useRef<string>("");
  useEffect(() => {
    let canPayHere = true;
    let valid = true;
    let breakdown: InvoiceBucketBreakdown | undefined;
    if (blockedLabHorse) {
      canPayHere = false;
      valid = false;
    } else if (!composition) {
      // If not selected we don't need composition — still valid for a simple
      // invoice from the server's canonical resolution.
      valid = !selected ? true : false;
    } else if (isComplex) {
      // Validate bucket allocations for this invoice (they must equal payment amount).
      const numericBuckets = complexBuckets.map((b) => ({
        key: b.key,
        kind: b.kind,
        horseId: b.kind === "horse" ? b.horseId : undefined,
        amount: parseFloat(bucketValues[b.key] || "0") || 0,
      }));
      const v = validateBucketAllocations({
        paymentAmount,
        buckets: numericBuckets,
        remainingByBucketKey,
      });
      valid = paymentAmount > 0 && v.ok === true;
      if (v.ok === true) {
        const horseAllocations = numericBuckets
          .filter((b) => b.kind === "horse" && b.amount > 0)
          .map((b) => ({ horseId: b.horseId!, amount: b.amount }));
        const clAmount = numericBuckets.find((b) => b.key === CLIENT_LEVEL_BUCKET_KEY)?.amount ?? 0;
        breakdown = {
          invoiceId: invoice.id,
          clientLevelAmount: clAmount,
          horseAllocations,
        };
      }
    } else {
      // Simple invoice — always valid; no breakdown needed.
      valid = true;
    }
    if (!selected) {
      valid = true;
      breakdown = undefined;
    }
    const key = JSON.stringify({ isComplex, canPayHere, valid, breakdown: breakdown ?? null });
    if (key === lastRef.current) return;
    lastRef.current = key;
    onResolved({ invoiceId: invoice.id, isComplex, canPayHere, breakdown, valid });
  }, [
    selected,
    composition,
    isComplex,
    blockedLabHorse,
    complexBuckets,
    bucketValues,
    paymentAmount,
    remainingByBucketKey,
    invoice.id,
    onResolved,
  ]);

  function updateBucket(key: string, next: string) {
    setManualMode(true);
    setBucketValues((prev) => ({ ...prev, [key]: next }));
  }

  function returnToAutomatic() {
    setManualMode(false);
    if (paymentAmount > 0) setBucketValues(autoProposal(paymentAmount));
    else setBucketValues({});
  }

  const allocated = selected ? paymentAmount : 0;
  const remainingAfter = Math.max(
    0,
    Math.round((invoice.outstanding - allocated) * 100) / 100,
  );

  return (
    <Accordion
      type="single"
      collapsible
      value={expanded}
      onValueChange={setExpanded}
      className="w-full"
    >
      <AccordionItem
        value={invoice.id}
        className={`rounded-md border overflow-hidden ${selected ? "bg-accent/20" : ""}`}
      >
        <div className="flex items-start gap-2 sm:gap-3 p-3 min-w-0">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onToggle(v === true)}
            disabled={disabled}
            className="mt-1 shrink-0"
            aria-label={invoice.invoice_number}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 min-w-0">
              <span className="font-medium text-sm">{invoice.invoice_number}</span>
              <StatusBadge status={invoice.status} />
              <span className="text-[11px] text-muted-foreground" dir="ltr">
                {invoice.issue_date}
                {invoice.due_date ? ` → ${invoice.due_date}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2 min-w-0">
              <div className="text-xs">
                <div className="text-muted-foreground">
                  {t("finance.payments.outstanding")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(invoice.outstanding)}
                </div>
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {t("finance.multiInvoicePayment.allocatedToInvoiceLabel")}
                </Label>
                <FinancialAmountInput
                  className="h-8"
                  placeholder="0.00"
                  disabled={!selected || disabled || !allocationEnabled || manualMode}
                  value={selected ? (Number.isFinite(paymentAmount) && amount !== "" ? paymentAmount : null) : null}
                  max={invoice.outstanding}
                  onValueChange={(next) => {
                    setOverMaxInvoice(false);
                    onAmountChange(next === null ? "" : next.toFixed(2));
                  }}
                  onInvalidDraft={(_raw, reason) => {
                    if (reason === "over-max") setOverMaxInvoice(true);
                  }}
                  aria-readonly={manualMode || undefined}
                  aria-label={t("finance.multiInvoicePayment.allocatedToInvoiceLabel")}
                />
                {overMaxInvoice && (
                  <div className="text-[10px] text-destructive">
                    {t("finance.multiInvoicePayment.errors.overMaxInvoice")}
                  </div>
                )}
                {manualMode && (
                  <div className="text-[10px] text-muted-foreground">
                    {t("finance.multiInvoicePayment.amountDerivedNotice")}
                  </div>
                )}

              </div>
              <div className="text-xs">
                <div className="text-muted-foreground">
                  {t("finance.multiInvoicePayment.remainingAfterPayment")}
                </div>
                <div dir="ltr" className="font-semibold tabular-nums">
                  {fmt(remainingAfter)}
                </div>
              </div>
              <div className="ms-auto flex items-center gap-1">
                {selected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    data-testid={`pay-in-full-${invoice.id}`}
                    disabled={
                      disabled ||
                      !allocationEnabled ||
                      manualMode ||
                      paymentAvailableForInvoice <= 0
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const cap = Math.max(
                        0,
                        Math.min(invoice.outstanding, paymentAvailableForInvoice),
                      );
                      onAmountChange(cap > 0 ? cap.toFixed(2) : "");
                    }}
                  >
                    {t("finance.multiInvoicePayment.payInFull")}
                  </Button>
                )}
                {onOpenDetails && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenDetails(invoice.id);
                    }}
                  >
                    {t("common.view")}
                  </Button>
                )}
                <AccordionTrigger className="py-1 px-2 rounded-md hover:bg-muted/50 text-xs font-normal no-underline hover:no-underline">
                  <span className="tabular-nums">
                    {t("finance.multiInvoicePayment.itemsCount").replace("{{count}}", String(invoice.itemCount))}
                  </span>
                </AccordionTrigger>
              </div>

            </div>
          </div>
        </div>

        <AccordionContent className="px-3 pb-3 space-y-3 border-t bg-background">
          {isLoading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t("finance.multiInvoicePayment.loadingComposition")}</span>
            </div>
          )}



          {selected && blockedLabHorse && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("finance.multiInvoicePayment.errors.notSupported")}
              </AlertDescription>
            </Alert>
          )}

          {selected && isComplex && !blockedLabHorse && (
            <div className="rounded-md border p-3 bg-muted/20 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-semibold text-primary">
                  {t("finance.multiInvoicePayment.internalDistribution")}
                </div>
                {manualMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={returnToAutomatic}
                    disabled={disabled}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 me-1" />
                    {t("finance.multiInvoicePayment.returnToAutomatic")}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {complexBuckets.map((bucket) => {
                  const displayName =
                    isRtl && bucket.labelAr
                      ? bucket.labelAr
                      : bucket.kind === "client"
                        ? t("finance.payments.allocation.clientLevel")
                        : bucket.label;
                  const showTax = bucket.tax > 0.005;
                  return (
                    <div key={bucket.key} className="rounded-md border p-2 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-medium truncate">{displayName}</span>
                        <span
                          dir="ltr"
                          className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0"
                        >
                          {t("finance.payments.allocation.remaining")}: {fmt(bucket.remaining)}
                        </span>
                      </div>
                      {showTax && (
                        <div className="grid grid-cols-2 gap-x-3 text-[11px] text-muted-foreground">
                          <span>{t("finance.payments.allocation.pretax")}</span>
                          <span dir="ltr" className="text-end font-mono tabular-nums">
                            {fmt(bucket.pretax)}
                          </span>
                          <span>{t("finance.payments.allocation.tax")}</span>
                          <span dir="ltr" className="text-end font-mono tabular-nums">
                            {fmt(bucket.tax)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground">
                            {t("finance.payments.allocation.allocated")}
                          </Label>
                          <FinancialAmountInput
                            value={(() => {
                              const s = bucketValues[bucket.key] ?? "";
                              if (s === "") return null;
                              const n = parseFloat(s);
                              return Number.isFinite(n) ? n : null;
                            })()}
                            max={bucket.remaining}
                            onValueChange={(next) => {
                              setOverMaxBuckets((prev) => ({ ...prev, [bucket.key]: false }));
                              updateBucket(bucket.key, next === null ? "" : next.toFixed(2));
                            }}
                            onInvalidDraft={(_raw, reason) => {
                              if (reason === "over-max") {
                                setOverMaxBuckets((prev) => ({ ...prev, [bucket.key]: true }));
                              }
                            }}
                            placeholder="0.00"
                            className="h-8"
                            disabled={disabled}
                            aria-label={`${bucket.label} allocation`}
                          />
                          {overMaxBuckets[bucket.key] && (
                            <div className="text-[10px] text-destructive mt-1">
                              {t("finance.multiInvoicePayment.errors.overMaxBucket")}
                            </div>
                          )}

                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground">
                            {t("finance.payments.allocation.remainingAfter")}
                          </Label>
                          <div
                            dir="ltr"
                            className="h-8 px-2 rounded-md border border-input bg-background flex items-center justify-end font-mono tabular-nums text-xs"
                          >
                            {fmt(
                              Math.max(
                                0,
                                Math.round(
                                  (bucket.remaining -
                                    (parseFloat(bucketValues[bucket.key] || "0") || 0)) *
                                    100,
                                ) / 100,
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
