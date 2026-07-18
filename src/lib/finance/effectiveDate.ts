/**
 * Slice 2 · 2QA-A — Canonical effective financial date contract.
 *
 * The Account Statement uses one and only one effective date per row for
 * range filtering, display, running balance, sorting, First Financial
 * Activity, and every export (screen, Print, PDF, CSV):
 *
 *   effectiveDate(row) = ledger_entries.created_at
 *
 * `ledger_entries.created_at` is the posting timestamp the platform already
 * relies on for the running balance and RLS-safe indexes. It is the only
 * timestamp guaranteed present on every row (invoice, payment, credit,
 * adjustment) with the same semantics.
 *
 * Presentation rules:
 *   - Boarding segment sub-rows always show the parent ledger entry's
 *     effective date in the Date column. The boarding period (which may
 *     precede the effective posting date) is shown in the Description column
 *     only. This guarantees a segment can never appear outside the selected
 *     range purely because its period_end falls in a different month.
 *   - Sorting uses the effective date so segments stay grouped with their
 *     parent posting.
 *
 * Date boundary rules (align on-screen filter and DB filter):
 *   - dateFrom is inclusive from 00:00:00.000 of the selected local day.
 *   - dateTo   is inclusive through 23:59:59.999 of the selected local day.
 *   - Local day = the browser/tenant local timezone; converted to a UTC
 *     ISO window before hitting Postgres.
 */
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

/**
 * Return the canonical effective ISO timestamp used for filtering, display,
 * and sorting of a statement entry.
 */
export function effectiveEntryDate(entry: StatementEntry): string {
  return entry.date;
}

/**
 * Convert a local yyyy-MM-dd `dateFrom` into an inclusive UTC ISO string
 * representing the start of that local day.
 */
export function localDateFromToUtcIso(dateFrom: string): string {
  // "2026-04-01" → local midnight → UTC ISO.
  const [y, m, d] = dateFrom.split("-").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  return local.toISOString();
}

/**
 * Convert a local yyyy-MM-dd `dateTo` into an inclusive UTC ISO string
 * representing the end of that local day (23:59:59.999 local time).
 */
export function localDateToToUtcIso(dateTo: string): string {
  const [y, m, d] = dateTo.split("-").map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return local.toISOString();
}
