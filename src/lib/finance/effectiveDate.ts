/**
 * Stage C · Slice A — Canonical finance read-date contract.
 *
 * ECONOMIC CHRONOLOGY (this file):
 *   effectiveDate(row) = ledger_entries.effective_date   (date-only, yyyy-MM-dd)
 *
 * `effective_date` is the business/economic date of a financial event and is
 * the ONLY field that may drive financial chronology: statement inclusion,
 * ordering, opening-balance cutoff, running-balance sequence, first financial
 * activity and export chronology.
 *
 * AUDIT CHRONOLOGY (never drives display order):
 *   created_at / updated_at / approval + posting timestamps. `created_at` is
 *   retained only as the first deterministic tie-breaker and as audit metadata.
 *
 * DOCUMENT CHRONOLOGY (owned by other modules, unchanged here):
 *   invoices.issue_date, invoices.due_date, payment_sessions.payment_date,
 *   expenses.expense_date, cancellation date, service date.
 *
 * Canonical ordering (ascending):
 *   effective_date ASC, created_at ASC, id ASC
 * Descending mirror:
 *   effective_date DESC, created_at DESC, id DESC
 * Backed by `ledger_entries_effective_composite_idx`
 * (tenant_id, client_id, effective_date, created_at, id).
 *
 * Date-filter contract (both bounds inclusive, date-only, no UTC conversion):
 *   effective_date >= from_date AND effective_date <= to_date
 *
 * Presentation rules:
 *   - `effective_date` is date-only. Never render a fabricated time
 *     (00:00 / 12:00 AM) for it. Time is rendered only for explicit audit
 *     timestamp fields.
 *   - Boarding segment sub-rows always show the parent ledger entry's
 *     effective date in the Date column; the boarding period stays in the
 *     Description column only.
 */
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

/** Canonical economic date (yyyy-MM-dd) of a statement entry. */
export function effectiveEntryDate(entry: StatementEntry): string {
  return entry.date;
}

/** Normalize any accepted date input to a date-only `yyyy-MM-dd` string. */
export function toEconomicDateString(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Accepts "yyyy-MM-dd" and legacy ISO timestamps; never shifts the day
  // because it slices instead of constructing a UTC Date.
  return String(value).slice(0, 10);
}

/**
 * Render a date-only economic date as `dd-MM-yyyy` with English digits.
 * Deliberately string-based: constructing `new Date("yyyy-MM-dd")` parses as
 * UTC midnight and shifts the day in negative-offset timezones.
 */
export function formatEconomicDate(value: string | Date | null | undefined): string {
  const iso = toEconomicDateString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** Inclusive date-only range test: from <= date <= to. */
export function isWithinEconomicRange(
  date: string,
  from?: string | null,
  to?: string | null
): boolean {
  const d = toEconomicDateString(date);
  if (from && d < toEconomicDateString(from)) return false;
  if (to && d > toEconomicDateString(to)) return false;
  return true;
}

/** Minimal shape needed to apply the canonical deterministic ordering. */
export interface EconomicOrderable {
  /** Economic date, yyyy-MM-dd. */
  date: string;
  /** Audit timestamp used strictly as the first tie-breaker. */
  createdAt?: string | null;
  /** Immutable row id used as the final tie-breaker. */
  id: string;
}

/**
 * Canonical deterministic comparator:
 *   effective_date, then created_at, then id.
 * Pass `"desc"` to mirror all three keys.
 */
export function compareEconomicOrder(
  a: EconomicOrderable,
  b: EconomicOrderable,
  direction: "asc" | "desc" = "asc"
): number {
  const sign = direction === "asc" ? 1 : -1;
  const da = toEconomicDateString(a.date);
  const db = toEconomicDateString(b.date);
  if (da !== db) return da < db ? -sign : sign;
  const ca = a.createdAt || "";
  const cb = b.createdAt || "";
  if (ca !== cb) return ca < cb ? -sign : sign;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -sign : sign;
}

/* ------------------------------------------------------------------ */
/* Monetary-safe accumulation                                          */
/* ------------------------------------------------------------------ */

/** Convert a monetary value (number or Postgres numeric string) to integer cents. */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convert integer cents back to a monetary number without cent drift. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Sum monetary values with integer-cent arithmetic (no float accumulation). */
export function sumMoney(values: Array<number | string | null | undefined>): number {
  let cents = 0;
  for (const v of values) cents += toCents(v);
  return fromCents(cents);
}

/* ------------------------------------------------------------------ */
/* Legacy timestamp-window helpers — NON-FINANCIAL / audit paths only  */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Economic chronology must use date-only `effective_date`
 * comparisons. These helpers remain only for surfaces that legitimately filter
 * an audit `timestamptz` column (e.g. unallocated payment sessions, pending
 * Stage-C cutover). Do not use them for `effective_date`.
 */
export function localDateFromToUtcIso(dateFrom: string): string {
  const [y, m, d] = dateFrom.split("-").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return local.toISOString();
}

/** @deprecated See {@link localDateFromToUtcIso}. */
export function localDateToToUtcIso(dateTo: string): string {
  const [y, m, d] = dateTo.split("-").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return local.toISOString();
}
