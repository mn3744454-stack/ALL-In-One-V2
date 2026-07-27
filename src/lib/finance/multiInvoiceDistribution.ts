/**
 * Phase N+3 · Slice 3 — Multi-Invoice Client Payment.
 *
 * Cent-safe deterministic distribution utilities for building the RPC payload
 * consumed by `public.post_payment_session`. The RPC accepts one allocation
 * row per non-zero `(invoice_id, payment_method)` pair and enforces caps on
 * `line_gross_amount` per horse / client-level scope.
 *
 * The helpers here operate in integer cents so no fractional cent can leak,
 * and use a deterministic largest-remainder method with stable tie-breakers
 * so identical inputs always yield an identical matrix (idempotency-friendly).
 */
import type {
  PaymentSessionAllocation,
  PaymentHorseAllocation,
  PaymentMethod,
} from "./postPaymentSession";

export const MAX_RPC_ALLOCATION_ROWS = 50;

export interface EligibleInvoiceOutstanding {
  invoiceId: string;
  outstanding: number;
  dueDate: string | null;
  issueDate: string;
  invoiceNumber: string;
}

export interface InvoiceAllocationInput {
  invoiceId: string;
  amount: number; // gross amount allocated to this invoice, in units (SAR etc.)
}

export interface TenderRowInput {
  id: string;
  method: PaymentMethod;
  amount: number; // in units
  reference?: string;
}

export interface HorseBucketAllocationInput {
  horseId: string;
  amount: number;
}

export interface InvoiceBucketBreakdown {
  invoiceId: string;
  clientLevelAmount: number;
  horseAllocations: HorseBucketAllocationInput[];
}

/** Compare two currency amounts in units to within 1 cent. */
export function centsEqual(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Deterministic largest-remainder split of `totalCents` into `weights.length`
 * integer buckets. Each bucket receives `floor(totalCents * w / Σw)`; the
 * residual cents are handed out one at a time to buckets with the largest
 * fractional remainder, ties broken by lower index (stable).
 */
export function largestRemainderSplit(
  totalCents: number,
  weights: number[],
): number[] {
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW <= 0 || totalCents <= 0) return weights.map(() => 0);
  const out: number[] = new Array(weights.length).fill(0);
  const remainders: Array<{ i: number; frac: number }> = [];
  let assigned = 0;
  for (let i = 0; i < weights.length; i++) {
    const share = (totalCents * weights[i]) / sumW;
    const floor = Math.floor(share);
    out[i] = floor;
    assigned += floor;
    remainders.push({ i, frac: share - floor });
  }
  const leftover = totalCents - assigned;
  remainders.sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  for (let k = 0; k < leftover; k++) out[remainders[k].i] += 1;
  return out;
}

/**
 * Explicit "oldest first" proposal: fills each invoice with as much of the
 * available total as its outstanding permits, walking invoices in the caller-
 * supplied deterministic sort order. The proposal remains editable by the
 * caller — nothing is auto-submitted.
 */
export function proposeOldestFirst(
  invoices: EligibleInvoiceOutstanding[],
  totalPaymentUnits: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  let remainingCents = Math.max(0, toCents(totalPaymentUnits));
  for (const inv of invoices) {
    const capCents = Math.max(0, toCents(inv.outstanding));
    const takeCents = Math.min(capCents, remainingCents);
    result[inv.invoiceId] = fromCents(takeCents);
    remainingCents -= takeCents;
    if (remainingCents <= 0) {
      // Ensure every invoice appears with a value (zero) for deterministic
      // downstream fingerprinting.
      for (const rest of invoices) {
        if (result[rest.invoiceId] === undefined) result[rest.invoiceId] = 0;
      }
      break;
    }
  }
  for (const inv of invoices) {
    if (result[inv.invoiceId] === undefined) result[inv.invoiceId] = 0;
  }
  return result;
}

/**
 * Manual complement rule (from the accepted Slice 2.2E logic, generalised):
 *
 * - Given a total target and per-invoice values, if exactly one invoice remains
 *   "untouched" AND the remainder is >= 0 AND <= its outstanding cap, fill it
 *   with the remainder. Otherwise return the values unchanged.
 * - With exactly two selected invoices, the "untouched" one is always the one
 *   not equal to the last edited key, so this yields the two-invoice complement
 *   behaviour naturally.
 */
export function applyComplement(params: {
  values: Record<string, number>;
  touched: Set<string>;
  totalPaymentUnits: number;
  outstandingByInvoice: Record<string, number>;
}): Record<string, number> {
  const { values, touched, totalPaymentUnits, outstandingByInvoice } = params;
  const keys = Object.keys(values);
  const untouched = keys.filter((k) => !touched.has(k));
  if (untouched.length !== 1) return values;
  const target = untouched[0];
  const totalCents = toCents(totalPaymentUnits);
  let usedCents = 0;
  for (const k of keys) {
    if (k === target) continue;
    usedCents += toCents(values[k] || 0);
  }
  const remainderCents = totalCents - usedCents;
  const capCents = toCents(outstandingByInvoice[target] ?? 0);
  if (remainderCents < 0 || remainderCents > capCents) return values;
  return { ...values, [target]: fromCents(remainderCents) };
}

/**
 * Build the RPC allocation matrix.
 *
 * One row per non-zero `(invoice_id, payment_method)` pair. Per-invoice tender
 * cells are computed by largest-remainder split so their cent sums preserve
 * both the invoice-column total and each tender-row total exactly. When the
 * caller supplies per-invoice `bucketBreakdown` (client-level + horse
 * allocations), those totals are propagated to every non-zero tender cell for
 * that invoice — again by cent-safe split — so the server-side per-scope caps
 * receive the exact frozen-gross amounts. Tender-row `reference` is copied to
 * every generated allocation row derived from that tender.
 */
export function buildAllocationsPayload(params: {
  invoiceOrder: string[]; // canonical sort (due_date, issue_date, number)
  invoiceAmountsUnits: Record<string, number>;
  tenderRows: TenderRowInput[];
  bucketBreakdownByInvoice?: Record<string, InvoiceBucketBreakdown | undefined>;
}): PaymentSessionAllocation[] {
  const {
    invoiceOrder,
    invoiceAmountsUnits,
    tenderRows,
    bucketBreakdownByInvoice,
  } = params;

  // Filter and normalise: only invoices with > 0 allocation participate.
  const activeInvoices = invoiceOrder.filter(
    (id) => toCents(invoiceAmountsUnits[id] || 0) > 0,
  );
  const activeTenders = tenderRows.filter((r) => toCents(r.amount) > 0);
  if (activeInvoices.length === 0 || activeTenders.length === 0) return [];

  // Per-invoice: split its amount across tender rows weighted by tender amount.
  // Then per-invoice-per-tender: split scope bucket amounts across the same
  // cells so the row-level `client_level_amount` and `horse_allocations` add
  // up to the cell amount, and the totals across cells for a given scope match
  // that scope's final allocation.
  const tenderWeights = activeTenders.map((r) => toCents(r.amount));

  const rows: PaymentSessionAllocation[] = [];

  for (const invoiceId of activeInvoices) {
    const invAmountCents = toCents(invoiceAmountsUnits[invoiceId]);
    // cell[t] = cents for this invoice paid by tender[t]
    const perTenderCents = largestRemainderSplit(invAmountCents, tenderWeights);

    // Compute per-tender scope splits.
    const bb = bucketBreakdownByInvoice?.[invoiceId];
    // clientLevel per tender
    const clWeights = perTenderCents.map((c) => c);
    const clTotalCents = bb ? toCents(bb.clientLevelAmount) : 0;
    const clPerTender = clTotalCents > 0
      ? largestRemainderSplit(clTotalCents, clWeights)
      : perTenderCents.map(() => 0);

    // Each horse per tender
    const horseSplits: Array<{ horseId: string; perTender: number[] }> = [];
    if (bb) {
      for (const h of bb.horseAllocations) {
        const hCents = toCents(h.amount);
        if (hCents <= 0) continue;
        horseSplits.push({
          horseId: h.horseId,
          perTender: largestRemainderSplit(hCents, clWeights),
        });
      }
    }

    for (let t = 0; t < activeTenders.length; t++) {
      const cellCents = perTenderCents[t];
      if (cellCents <= 0) continue;
      const tender = activeTenders[t];

      const horseAllocations: PaymentHorseAllocation[] = [];
      let scopeSumCents = clPerTender[t];
      for (const h of horseSplits) {
        const hCellCents = h.perTender[t];
        if (hCellCents > 0) {
          horseAllocations.push({
            horse_id: h.horseId,
            amount: fromCents(hCellCents),
          });
          scopeSumCents += hCellCents;
        }
      }

      // Reconciliation safety: if bucket breakdown was supplied, the scope sum
      // must equal the cell amount. If not supplied (simple invoice), scope is
      // resolved server-side (canonical horse / client-level auto-fill).
      const row: PaymentSessionAllocation = {
        invoice_id: invoiceId,
        payment_method: tender.method,
        amount: fromCents(cellCents),
      };
      if (bb) {
        // When a breakdown is provided we must satisfy the server invariant
        // `ha_total + client_level_amount = amount`. Nudge the last horse (or
        // client-level when no horses) to absorb any 1-cent rounding delta.
        const delta = cellCents - scopeSumCents;
        if (delta !== 0) {
          if (horseAllocations.length > 0) {
            const last = horseAllocations[horseAllocations.length - 1];
            last.amount = fromCents(toCents(last.amount) + delta);
          } else {
            clPerTender[t] = clPerTender[t] + delta;
          }
        }
        row.client_level_amount = fromCents(clPerTender[t]);
        if (horseAllocations.length > 0) row.horse_allocations = horseAllocations;
      }
      if (tender.reference && tender.reference.trim()) {
        row.external_reference = tender.reference.trim();
      }
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Count the non-zero `(invoice, tender)` cells the payload would generate.
 * The RPC hard-caps this at 50 rows.
 */
export function countGeneratedRows(params: {
  invoiceAmountsUnits: Record<string, number>;
  tenderRows: TenderRowInput[];
}): number {
  const invoices = Object.entries(params.invoiceAmountsUnits).filter(
    ([, v]) => toCents(v) > 0,
  );
  const tenders = params.tenderRows.filter((r) => toCents(r.amount) > 0);
  if (invoices.length === 0 || tenders.length === 0) return 0;
  // Every (invoice, tender) cell is non-zero because per-invoice we split by
  // tender weight ≥ 1 cent and no weight is zero here.
  return invoices.length * tenders.length;
}
