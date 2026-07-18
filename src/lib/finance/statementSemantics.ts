/**
 * Slice 2 · 2QA-A — Statement financial semantic classifier.
 *
 * Single source of truth for how ledger rows are classified across the on-screen
 * statement, scoped/overall summaries, running balance, Print, PDF, and CSV.
 * Read-only — never mutates ledger data.
 *
 * Classification is evidence-based against the actual `ledger_entries` schema:
 *   - entry_type ∈ {'invoice','payment','credit','adjustment'}
 *   - reference_type is free-form text; canonical markers we recognize are
 *     'invoice', 'invoice_cancellation', 'invoice_reversal'.
 *   - description may carry human reconciliation markers when reference_type
 *     is not explicitly set (Phase 6 reconciliation rows are a real case).
 *
 * The classifier NEVER counts cancellation/reversal/void adjustments as a
 * customer payment. It also never invents transaction types unsupported by
 * the underlying row.
 */
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

export type LedgerSemanticClass =
  | "posted_invoice_debit"     // Real invoice posting increasing customer balance.
  | "invoice_debit_reversal"   // entry_type='invoice' with a negative amount that reverses a prior invoice debit.
  | "real_payment"             // Actual monetary settlement from the customer.
  | "payment_refund"           // Money returned to the customer (positive payment).
  | "credit_note"              // Formal credit note issued to the customer.
  | "invoice_cancellation"     // Adjustment cancelling / voiding an invoice.
  | "invoice_reversal"         // Adjustment reversing an already-posted invoice.
  | "accounting_adjustment"    // Neutral / manual accounting adjustment (not a payment, not a cancellation).
  | "unresolved_legacy";       // Row we cannot confidently classify.

export interface ClassifiedEntry {
  entry: StatementEntry;
  semanticClass: LedgerSemanticClass;
  /** True when the row represents genuine cash/settlement from customer. */
  isRealPayment: boolean;
  /** True when the row is a posted invoice debit that should count in Total Invoices. */
  isPostedInvoiceDebit: boolean;
  /** True when the row is a cancellation/reversal (must NEVER be counted as Paid). */
  isCancellationOrReversal: boolean;
  /**
   * True when this row is a cancellation/reversal whose paired posted invoice
   * debit is NOT present in the current scope. Its monetary effect must be
   * neutralized (zeroed) in scoped summaries and the running balance to
   * prevent a false credit balance.
   */
  isOrphanCancellation: boolean;
}

const CANCELLATION_MARKER_RE =
  /(reconciliation|cancel|void|reversal|refund|إلغاء|عكس|تسوية|إشعار\s*دائن|استرداد)/i;

/**
 * Best-effort classification. Prefers explicit `reference_type` markers, then
 * falls back to a conservative description signal. Never guesses cancellation
 * for a plain payment row and never guesses payment for a plain adjustment row.
 */
export function classifyLedgerEntry(
  entry: StatementEntry,
  ctx?: { scopedPostedInvoiceRefIds?: Set<string> }
): ClassifiedEntry {
  const type = entry.entry_type;
  const refType = (entry.reference_type || "").toLowerCase();
  const desc = entry.description || "";
  const isPositive = entry.debit > 0;
  const isNegative = entry.credit > 0;
  const looksLikeCancellationText = CANCELLATION_MARKER_RE.test(desc);
  const explicitCancellationRef =
    refType === "invoice_cancellation" || refType === "invoice_reversal";

  let semanticClass: LedgerSemanticClass = "unresolved_legacy";

  if (type === "invoice") {
    if (isPositive) semanticClass = "posted_invoice_debit";
    else if (isNegative) semanticClass = "invoice_debit_reversal";
  } else if (type === "payment") {
    if (explicitCancellationRef || (looksLikeCancellationText && isNegative && !entry.payment_method)) {
      semanticClass = "invoice_cancellation";
    } else if (isNegative) {
      semanticClass = "real_payment";
    } else if (isPositive) {
      semanticClass = "payment_refund";
    }
  } else if (type === "credit") {
    semanticClass = "credit_note";
  } else if (type === "adjustment") {
    if (explicitCancellationRef || (looksLikeCancellationText && isNegative)) {
      semanticClass = "invoice_cancellation";
    } else if (looksLikeCancellationText && isPositive) {
      semanticClass = "invoice_reversal";
    } else {
      semanticClass = "accounting_adjustment";
    }
  }

  const isCancellationOrReversal =
    semanticClass === "invoice_cancellation" ||
    semanticClass === "invoice_reversal" ||
    semanticClass === "invoice_debit_reversal";

  // 2QA-A · Finding 1 (patch) — orphan cancellation detection.
  // A cancellation/reversal is "orphan" when its paired posted-invoice debit
  // is not present in the currently-scoped entry set. Its monetary effect
  // MUST be neutralized to prevent a false credit balance (e.g. the invoice
  // debit was posted in March but excluded by an April date scope, while the
  // April cancellation credit remains).
  let isOrphanCancellation = false;
  if (
    isCancellationOrReversal &&
    ctx?.scopedPostedInvoiceRefIds &&
    entry.reference_id
  ) {
    isOrphanCancellation = !ctx.scopedPostedInvoiceRefIds.has(entry.reference_id);
  }

  return {
    entry,
    semanticClass,
    isRealPayment: semanticClass === "real_payment",
    isPostedInvoiceDebit: semanticClass === "posted_invoice_debit",
    isCancellationOrReversal,
    isOrphanCancellation,
  };
}

export interface StatementFinancialSummary {
  totalInvoices: number;
  totalPaid: number;
  rawBalance: number;
  outstanding: number;
  creditBalance: number;
  counts: Record<LedgerSemanticClass, number>;
  /** Reference_ids of cancellation/reversal rows that were neutralized. */
  neutralizedRowIds: string[];
}

/**
 * Batch-classify a set of entries with orphan-cancellation detection applied
 * relative to the same set. Callers rendering the ledger table can reuse this
 * to skip neutralized rows in the running balance.
 */
export function classifyEntries(entries: StatementEntry[]): ClassifiedEntry[] {
  const scopedPostedInvoiceRefIds = new Set<string>();
  // First pass: collect reference_ids of posted invoice debits in the set.
  for (const e of entries) {
    if (e.entry_type === "invoice" && e.debit > 0 && e.reference_id) {
      scopedPostedInvoiceRefIds.add(e.reference_id);
    }
  }
  // Second pass: classify with the scoped context.
  return entries.map((e) => classifyLedgerEntry(e, { scopedPostedInvoiceRefIds }));
}

export function summarizeStatement(entries: StatementEntry[]): StatementFinancialSummary {
  const counts: Record<LedgerSemanticClass, number> = {
    posted_invoice_debit: 0,
    invoice_debit_reversal: 0,
    real_payment: 0,
    payment_refund: 0,
    credit_note: 0,
    invoice_cancellation: 0,
    invoice_reversal: 0,
    accounting_adjustment: 0,
    unresolved_legacy: 0,
  };

  const classified = classifyEntries(entries);
  const neutralizedRowIds: string[] = [];
  let totalInvoices = 0;
  let totalPaid = 0;
  let rawBalance = 0;

  for (const c of classified) {
    counts[c.semanticClass] += 1;
    if (c.isOrphanCancellation) {
      neutralizedRowIds.push(c.entry.id);
      // Skip monetary effect entirely.
      continue;
    }
    rawBalance += c.entry.debit - c.entry.credit;
    if (c.isPostedInvoiceDebit) totalInvoices += c.entry.debit;
    if (c.isRealPayment) totalPaid += c.entry.credit;
  }

  const outstanding = Math.max(0, rawBalance);
  const creditBalance = Math.abs(Math.min(0, rawBalance));
  return { totalInvoices, totalPaid, rawBalance, outstanding, creditBalance, counts, neutralizedRowIds };
}

/**
 * Human-facing label for a semantic class. Callers pass their own bilingual
 * source (t/isRTL) so this module stays framework-free.
 */
export function semanticClassLabel(
  cls: LedgerSemanticClass,
  isRTL: boolean
): string {
  const map: Record<LedgerSemanticClass, [string, string]> = {
    posted_invoice_debit:    ["Invoice",                "فاتورة"],
    invoice_debit_reversal:  ["Invoice Reversal",        "عكس فاتورة"],
    real_payment:            ["Payment",                 "دفعة"],
    payment_refund:          ["Payment Refund",          "استرداد دفعة"],
    credit_note:             ["Credit Note",             "إشعار دائن"],
    invoice_cancellation:    ["Invoice Cancellation",    "إلغاء فاتورة"],
    invoice_reversal:        ["Invoice Reversal",        "عكس فاتورة"],
    accounting_adjustment:   ["Accounting Adjustment",   "تسوية محاسبية"],
    unresolved_legacy:       ["Adjustment",              "تسوية"],
  };
  const [en, ar] = map[cls];
  return isRTL ? ar : en;
}
