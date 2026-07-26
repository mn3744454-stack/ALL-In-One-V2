/**
 * Phase N+3 · Slice 2 — Payment allocation distribution helpers.
 *
 * The Payment RPC (`post_payment_session`) accepts horse/client-level
 * allocations per allocation row (i.e. per tender / payment method). The UI,
 * however, models allocation at the invoice level (one bucket per Horse +
 * optional Client-Level bucket) independent of how the customer tenders the
 * money.
 *
 * This module maps the invoice-level bucket amounts across the tender rows
 * with a stable, deterministic, cent-safe split so that:
 *   - Σ(row.amount) === total payment                     (unchanged)
 *   - for every bucket: Σ across rows === bucket amount   (no double-count)
 *   - each row carries `horse_allocations` / `client_level_amount` summing
 *     to that row's amount.
 *
 * Pure module — no React, no supabase, no i18n.
 */

import type {
  PaymentSessionAllocation,
  PaymentMethod,
  PaymentHorseAllocation,
} from "./postPaymentSession";

export const CLIENT_LEVEL_BUCKET_KEY = "__client__";

export interface TenderRow {
  /** Human/machine payment method. Must be one of the allowlisted values. */
  payment_method: PaymentMethod;
  /** Money entered for this tender row, in the invoice currency. */
  amount: number;
  /** Optional per-tender external reference (cheque #, txn id, …). */
  external_reference?: string;
}

export type BucketKind = "horse" | "client";

/**
 * Bucket allocation entry emitted by the editor upward. Amount is what the
 * user assigned to that bucket for the entire invoice — NOT per tender.
 */
export interface BucketAllocation {
  key: string;              // horseId for horse buckets; CLIENT_LEVEL_BUCKET_KEY for client-level
  kind: BucketKind;
  horseId?: string;         // present when kind === "horse"
  amount: number;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Absolute delta between two numbers, rounded to cents for comparison. */
function centsDiff(a: number, b: number): number {
  return Math.abs(Math.round((a - b) * 100));
}

export interface DistributionInput {
  tenders: TenderRow[];
  /** Non-zero bucket allocations. Client-level bucket, if any, is included. */
  buckets: BucketAllocation[];
}

/**
 * Distribute bucket totals across tender rows.
 *
 * Algorithm (per bucket, independent of other buckets):
 *   1. Compute a proportional share for each tender: bucket.amount * tender.amount / totalPayment.
 *   2. Round each share down to the nearest cent.
 *   3. Distribute the remaining residual cents one-by-one to the tenders with
 *      the largest fractional remainder (ties broken by original tender order)
 *      so the sum equals bucket.amount exactly.
 *
 * Result: for every tender row, sum of (horse allocations + client-level) equals
 * that row's amount; totals match by construction.
 */
export function distributeBucketsAcrossTenders(
  input: DistributionInput,
): PaymentSessionAllocation[] {
  const { tenders, buckets } = input;
  const totalPayment = roundCents(tenders.reduce((s, r) => s + r.amount, 0));
  if (totalPayment <= 0) throw new Error("FIN_PAYMENT_AMOUNT_INVALID");

  const totalBucket = roundCents(buckets.reduce((s, b) => s + b.amount, 0));
  if (centsDiff(totalBucket, totalPayment) !== 0) {
    throw new Error("FIN_HORSE_ALLOCATION_MISMATCH");
  }

  // per-tender running client-level + horse allocation maps
  const perTenderHorse: Map<string, number>[] = tenders.map(() => new Map());
  const perTenderClient: number[] = tenders.map(() => 0);

  for (const bucket of buckets) {
    if (bucket.amount < 0) throw new Error("FIN_HORSE_ALLOCATION_MISMATCH");
    if (bucket.amount === 0) continue;

    // Proportional share in cents, floored, plus fractional remainder tracker.
    const bucketCents = Math.round(bucket.amount * 100);
    const shares: { idx: number; base: number; frac: number }[] = tenders.map(
      (t, idx) => {
        const exact = (bucketCents * t.amount) / totalPayment;
        const base = Math.floor(exact);
        const frac = exact - base;
        return { idx, base, frac };
      },
    );
    let assigned = shares.reduce((s, x) => s + x.base, 0);
    let residual = bucketCents - assigned;

    // Assign residual cents by largest fractional remainder; ties by original order.
    const order = [...shares].sort(
      (a, b) => b.frac - a.frac || a.idx - b.idx,
    );
    for (const s of order) {
      if (residual <= 0) break;
      s.base += 1;
      residual -= 1;
    }

    for (const s of shares) {
      const share = s.base / 100;
      if (share <= 0) continue;
      if (bucket.kind === "client") {
        perTenderClient[s.idx] = roundCents(perTenderClient[s.idx] + share);
      } else if (bucket.horseId) {
        const map = perTenderHorse[s.idx];
        map.set(bucket.horseId, roundCents((map.get(bucket.horseId) ?? 0) + share));
      }
    }
  }

  // Build the PaymentSessionAllocation array.
  return tenders.map((tender, idx) => {
    const horseMap = perTenderHorse[idx];
    const horse_allocations: PaymentHorseAllocation[] = Array.from(horseMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([horse_id, amount]) => ({ horse_id, amount }));
    const alloc: PaymentSessionAllocation = {
      invoice_id: "", // caller must set
      payment_method: tender.payment_method,
      amount: roundCents(tender.amount),
    };
    if (perTenderClient[idx] > 0) alloc.client_level_amount = perTenderClient[idx];
    if (horse_allocations.length > 0) alloc.horse_allocations = horse_allocations;
    if (tender.external_reference) alloc.external_reference = tender.external_reference;
    return alloc;
  });
}

/**
 * Validate a bucket allocation map (per-bucket caps, totals, negatives).
 * Returns `{ ok: true }` or `{ ok: false; code }` with a FIN_* code.
 */
export function validateBucketAllocations(input: {
  paymentAmount: number;
  buckets: BucketAllocation[];
  remainingByBucketKey: Record<string, number>;
}): { ok: true } | { ok: false; code: string } {
  const { paymentAmount, buckets, remainingByBucketKey } = input;
  let total = 0;
  for (const b of buckets) {
    if (!Number.isFinite(b.amount) || b.amount < 0) {
      return { ok: false, code: "FIN_HORSE_ALLOCATION_MISMATCH" };
    }
    // Reject fractional amounts finer than a cent.
    if (Math.round(b.amount * 100) !== b.amount * 100) {
      return { ok: false, code: "FIN_HORSE_ALLOCATION_MISMATCH" };
    }
    const cap = remainingByBucketKey[b.key];
    if (typeof cap === "number" && b.amount > cap + 0.0001) {
      return { ok: false, code: "FIN_HORSE_ALLOCATION_MISMATCH" };
    }
    total = roundCents(total + b.amount);
  }
  if (centsDiff(total, paymentAmount) !== 0) {
    return { ok: false, code: "FIN_HORSE_ALLOCATION_MISMATCH" };
  }
  return { ok: true };
}
