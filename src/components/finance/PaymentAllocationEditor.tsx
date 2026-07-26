import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
 * Slice-2 allocation editor. Emits per-bucket string amounts upward; the
 * dialog is responsible for turning them into a BucketAllocation[] for the
 * writer at submit time.
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

  const bucketByKey = useMemo(() => {
    const map = new Map<string, InvoiceBucket>();
    for (const b of composition.buckets) map.set(b.key, b);
    return map;
  }, [composition.buckets]);

  const remainingByBucketKey = useMemo(() => {
    const r: Record<string, number> = {};
    for (const b of composition.buckets) r[b.key] = b.remaining;
    return r;
  }, [composition.buckets]);

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

  const isFullPayment = Math.abs(paymentAmount - composition.remainingTotal) < 0.01;

  function updateBucket(key: string, next: string) {
    onChange({ ...value, [key]: next });
  }

  function applyProposal() {
    // Fill each bucket with its remaining attributable, capped so the total
    // equals paymentAmount (identity when paymentAmount === remainingTotal).
    const next: Record<string, string> = {};
    let left = paymentAmount;
    for (const b of composition.buckets) {
      const share = Math.min(b.remaining, left);
      const rounded = Math.round(share * 100) / 100;
      next[b.key] = rounded > 0 ? rounded.toFixed(2) : "";
      left = Math.round((left - rounded) * 100) / 100;
    }
    onChange(next);
  }

  function distributeEqually() {
    // Split paymentAmount evenly across buckets that still have remaining
    // capacity, capping each bucket at its remaining. Any residual from
    // capped buckets rolls over to buckets that still have headroom.
    const next: Record<string, string> = {};
    const eligible = composition.buckets.filter((b) => b.remaining > 0.005);
    if (eligible.length === 0 || paymentAmount <= 0) {
      onChange(next);
      return;
    }
    const capsCents = new Map<string, number>(
      eligible.map((b) => [b.key, Math.round(b.remaining * 100)]),
    );
    const assignedCents = new Map<string, number>(eligible.map((b) => [b.key, 0]));
    let remainingCents = Math.round(paymentAmount * 100);
    let active = new Set(eligible.map((b) => b.key));

    // Iterative equal-share pass; each round distributes floor(remaining/N)
    // to active buckets and retires any that hit their cap.
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
    // Distribute any 1-cent residual to active buckets in order.
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
    onChange(next);
  }

  function resetAllocations() {
    const next: Record<string, string> = {};
    for (const b of composition.buckets) next[b.key] = "";
    onChange(next);
  }

  function assignRemainderTo(key: string) {
    const current = parseAmount(value[key]);
    const cap = remainingByBucketKey[key] ?? 0;
    const desired = Math.round((current + unallocated) * 100) / 100;
    const capped = Math.max(0, Math.min(cap, desired));
    updateBucket(key, capped > 0 ? capped.toFixed(2) : "");
  }

  // Item-to-horse display list.
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
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {t("finance.payments.allocation.title")}
        </Label>
        <div className="flex gap-2 flex-wrap">
          {isFullPayment && (
            <Button type="button" size="sm" variant="outline" onClick={applyProposal}>
              {t("finance.payments.allocation.useProposal")}
            </Button>
          )}
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

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("finance.payments.allocation.allocated")}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={value[bucket.key] ?? ""}
                    onChange={(e) => updateBucket(bucket.key, sanitize(e.target.value))}
                    placeholder="0.00"
                    className="h-9 font-mono tabular-nums text-end"
                    dir="ltr"
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
                {unallocated > 0.005 && bucket.remaining > 0.005 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => assignRemainderTo(bucket.key)}
                    className="h-9"
                  >
                    {t("finance.payments.allocation.assignAll")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Separator />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("finance.payments.allocation.allocated")}
          </span>
          <span className="font-mono tabular-nums" dir="ltr">{fmt(allocatedTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t("finance.payments.totalPayment")}
          </span>
          <span className="font-mono tabular-nums" dir="ltr">{fmt(paymentAmount)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{t("finance.payments.allocation.unallocated")}</span>
          <span
            className={`font-mono tabular-nums ${Math.abs(unallocated) < 0.01 ? "text-success" : "text-warning"}`}
            dir="ltr"
          >
            {fmt(unallocated)}
          </span>
        </div>
      </div>

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

function sanitize(v: string): string {
  // Keep digits and at most one decimal separator; clamp to 2 decimals.
  const cleaned = v.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function parseAmount(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
