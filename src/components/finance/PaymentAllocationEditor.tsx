import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FinancialAmountInput } from "./FinancialAmountInput";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Users, Package } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import {
  CLIENT_LEVEL_BUCKET_KEY,
  type BucketAllocation,
  validateBucketAllocations,
} from "@/lib/finance/allocationDistribution";
import type { InvoiceBucket, InvoiceCompositionSummary } from "@/hooks/finance/useInvoicePriorAllocations";

interface PaymentAllocationEditorProps {
  composition: InvoiceCompositionSummary;
  paymentAmount: number;
  currency: string;
  invoiceItems: Array<{
    id: string;
    description: string;
    total_price: number;
    horse_id?: string | null;
    lab_horse_id?: string | null;
  }>;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  onValidityChange?: (valid: boolean) => void;
}

/**
 * Slice 2.2E allocation editor. Only two actions: Distribute Equally + Reset.
 * Manual auto-completion: when the user edits a bucket and exactly one other
 * bucket remains "unresolved" (never explicitly touched by the user since the
 * last reset), the untouched bucket receives the valid remainder. An auto-
 * generated value is NOT treated as a user-touched value, so in the two-bucket
 * case the "other" bucket is always the complement of the last edit.
 */
export function PaymentAllocationEditor({
  composition,
  paymentAmount,
  currency,
  invoiceItems,
  value,
  onChange,
  onValidityChange,
}: PaymentAllocationEditorProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const fmt = (n: number) => formatCurrency(n, currency);

  const remainingByBucketKey = useMemo(() => {
    const r: Record<string, number> = {};
    for (const b of composition.buckets) r[b.key] = b.remaining;
    return r;
  }, [composition.buckets]);

  // Track which bucket keys the USER has explicitly edited since last reset.
  // Values written by auto-completion do NOT mark a key as touched, so the
  // two-bucket "always complement" behavior holds across successive edits.
  const touchedRef = useRef<Set<string>>(new Set());

  const numericBuckets: BucketAllocation[] = useMemo(
    () =>
      composition.buckets.map((b) => ({
        key: b.key,
        kind: b.kind,
        horseId: b.kind === "horse" ? b.horseId : undefined,
        amount: parseAmount(value[b.key]),
      })),
    [composition.buckets, value],
  );

  const allocatedTotal = useMemo(
    () => Math.round(numericBuckets.reduce((s, b) => s + b.amount, 0) * 100) / 100,
    [numericBuckets],
  );
  const unallocated = Math.round((paymentAmount - allocatedTotal) * 100) / 100;

  const validation = useMemo(() => {
    if (paymentAmount <= 0) return { ok: false as const, code: "FIN_PAYMENT_AMOUNT_INVALID" };
    return validateBucketAllocations({
      paymentAmount,
      buckets: numericBuckets,
      remainingByBucketKey,
    });
  }, [paymentAmount, numericBuckets, remainingByBucketKey]);

  useEffect(() => {
    onValidityChange?.(validation.ok === true);
  }, [validation, onValidityChange]);

  function updateBucket(key: string, next: string) {
    // Mark THIS key as user-touched.
    touchedRef.current.add(key);

    const draft: Record<string, string> = { ...value, [key]: next };

    // Locate a single "unresolved" other bucket. An unresolved bucket is one
    // that the user has NOT explicitly edited since the last reset.
    const otherKeys = composition.buckets
      .map((b) => b.key)
      .filter((k) => k !== key && !touchedRef.current.has(k));

    if (otherKeys.length === 1) {
      const target = otherKeys[0];
      const cap = remainingByBucketKey[target] ?? 0;
      // Sum of every bucket EXCEPT the auto-target, using integer cents.
      const totalCents = Math.round(paymentAmount * 100);
      let sumOtherCents = 0;
      for (const b of composition.buckets) {
        if (b.key === target) continue;
        sumOtherCents += Math.round(parseAmount(draft[b.key]) * 100);
      }
      const complementCents = totalCents - sumOtherCents;
      const capCents = Math.round(cap * 100);
      if (Number.isFinite(complementCents) && complementCents >= 0 && complementCents <= capCents) {
        draft[target] = complementCents > 0 ? (complementCents / 100).toFixed(2) : "";
      }
      // If invalid (negative or over cap), leave `target` at whatever it was.
      // The validator will surface FIN_HORSE_ALLOCATION_MISMATCH.
    }

    onChange(draft);
  }

  function distributeEqually() {
    // Split paymentAmount evenly across buckets that still have remaining
    // capacity, capping each bucket at its remaining. Any residual from
    // capped buckets rolls over to buckets that still have headroom.
    const next: Record<string, string> = {};
    const eligible = composition.buckets.filter((b) => b.remaining > 0.005);
    if (eligible.length === 0 || paymentAmount <= 0) {
      onChange(next);
      touchedRef.current = new Set(composition.buckets.map((b) => b.key));
      return;
    }
    const capsCents = new Map<string, number>(
      eligible.map((b) => [b.key, Math.round(b.remaining * 100)]),
    );
    const assignedCents = new Map<string, number>(eligible.map((b) => [b.key, 0]));
    let remainingCents = Math.round(paymentAmount * 100);
    const active = new Set(eligible.map((b) => b.key));

    while (remainingCents > 0 && active.size > 0) {
      const share = Math.floor(remainingCents / active.size);
      if (share === 0) break;
      for (const key of Array.from(active)) {
        const cap = capsCents.get(key)!;
        const cur = assignedCents.get(key)!;
        const room = cap - cur;
        const give = Math.min(share, room);
        assignedCents.set(key, cur + give);
        remainingCents -= give;
        if (cur + give >= cap) active.delete(key);
      }
    }
    for (const key of Array.from(active)) {
      if (remainingCents <= 0) break;
      const cap = capsCents.get(key)!;
      const cur = assignedCents.get(key)!;
      if (cur < cap) {
        assignedCents.set(key, cur + 1);
        remainingCents -= 1;
      }
    }
    for (const [key, cents] of assignedCents) {
      next[key] = cents > 0 ? (cents / 100).toFixed(2) : "";
    }
    // Equal distribution assigns every eligible bucket a deterministic value,
    // so mark every bucket touched — no auto-completion should override.
    touchedRef.current = new Set(composition.buckets.map((b) => b.key));
    onChange(next);
  }

  function resetAllocations() {
    const next: Record<string, string> = {};
    for (const b of composition.buckets) next[b.key] = "";
    touchedRef.current = new Set();
    onChange(next);
  }

  const itemsByBucket = useMemo(() => {
    const map = new Map<string, Array<{ description: string; total_price: number }>>();
    for (const it of invoiceItems) {
      const total = Number(it.total_price) || 0;
      if (total <= 0) continue;
      const key = it.horse_id
        ? it.horse_id
        : it.lab_horse_id
          ? `lab:${it.lab_horse_id}`
          : CLIENT_LEVEL_BUCKET_KEY;
      const arr = map.get(key) ?? [];
      arr.push({ description: it.description, total_price: total });
      map.set(key, arr);
    }
    return map;
  }, [invoiceItems]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium">
          {t("finance.payments.allocation.title")}
        </Label>
        <div className="flex gap-2 flex-wrap">
          {paymentAmount > 0 && composition.buckets.length > 1 && (
            <Button type="button" size="sm" variant="outline" onClick={distributeEqually}>
              {t("finance.payments.allocation.distributeEqually")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={resetAllocations}>
            {t("finance.payments.allocation.resetProposal")}
          </Button>
        </div>
      </div>

      {composition.buckets.map((bucket) => {
        const items = itemsByBucket.get(bucket.key) ?? [];
        const isHorse = bucket.kind === "horse";
        const displayName = isRtl && bucket.labelAr ? bucket.labelAr : bucket.label;
        const showTaxBreakdown = bucket.tax > 0.005;
        return (
          <Card key={bucket.key} className="bg-muted/30">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isHorse ? (
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {isHorse
                      ? `${t("finance.payments.allocation.horseLabel")}: ${displayName}`
                      : t("finance.payments.allocation.clientLevel")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">
                  {t("finance.payments.allocation.remaining")}: {fmt(bucket.remaining)}
                </span>
              </div>

              {items.length > 0 && (
                <div className="ps-6 space-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground">
                      <span className="truncate flex-1 pe-2 flex items-center gap-1">
                        <Package className="h-3 w-3 shrink-0" />
                        {it.description}
                      </span>
                      <span className="font-mono tabular-nums" dir="ltr">
                        {fmt(it.total_price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Frozen line breakdown — shows Pretax + Tax rows only when
                  the invoice's frozen bucket tax > 0. Total Due always shows
                  so the user sees where each bucket's capacity comes from. */}
              <div className="ps-6 space-y-0.5 text-xs">
                {showTaxBreakdown && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("finance.payments.allocation.pretax")}
                      </span>
                      <span className="font-mono tabular-nums" dir="ltr">
                        {fmt(bucket.pretax)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("finance.payments.allocation.tax")}
                      </span>
                      <span className="font-mono tabular-nums" dir="ltr">
                        {fmt(bucket.tax)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold">
                  <span>{t("finance.payments.allocation.totalDue")}</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {fmt(bucket.gross)}
                  </span>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("finance.payments.allocation.allocated")}
                  </Label>
                  <FinancialAmountInput
                    value={(() => {
                      const raw = value[bucket.key];
                      const n = parseFloat(raw ?? "");
                      return Number.isFinite(n) && raw !== "" && raw !== undefined ? n : null;
                    })()}
                    onValueChange={(next) =>
                      updateBucket(bucket.key, next === null ? "" : next.toFixed(2))
                    }
                    max={bucket.remaining}
                    placeholder="0.00"
                    className="h-9"
                    aria-label={`${bucket.label} allocation`}
                  />

                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("finance.payments.allocation.remainingAfter")}
                  </Label>
                  <div
                    className="h-9 px-3 rounded-md border border-input bg-background flex items-center justify-end font-mono tabular-nums text-sm"
                    dir="ltr"
                  >
                    {fmt(
                      Math.max(
                        0,
                        Math.round(
                          (bucket.remaining - parseAmount(value[bucket.key])) * 100,
                        ) / 100,
                      ),
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}


      {validation.ok === false && paymentAmount > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {validation.code === "FIN_HORSE_ALLOCATION_MISMATCH"
              ? t("finance.payments.allocation.remainderMismatch")
              : t("finance.payments.errors.unknown")}
          </AlertDescription>
        </Alert>
      )}

      {validation.ok === true && Math.abs(unallocated) < 0.01 && (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          {t("finance.payments.allocation.balanced")}
        </Badge>
      )}
    </div>
  );
}


function parseAmount(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
