/**
 * Slice 3.3 — pure projection behind the MultiInvoiceKpiBar and unknown
 * InvoiceStatusBadge fallback. Node-env safe (no React) so it can be
 * unit-tested directly.
 */

export interface KpiCell {
  id: "eligible" | "totalOutstanding" | "selected" | "selectedOutstanding";
  labelKey: string;
  /** Raw value; formatting (currency / page indicator) happens at render. */
  value: number;
}

export function buildKpiCells(input: {
  eligibleCount: number;
  totalOutstanding: number;
  selectedCount: number;
  selectedOutstanding: number;
}): KpiCell[] {
  return [
    {
      id: "eligible",
      labelKey: "finance.multiInvoicePayment.summary.eligibleCount",
      value: input.eligibleCount,
    },
    {
      id: "totalOutstanding",
      labelKey: "finance.multiInvoicePayment.summary.totalOutstanding",
      value: input.totalOutstanding,
    },
    {
      id: "selected",
      labelKey: "finance.multiInvoicePayment.summary.selectedCount",
      value: input.selectedCount,
    },
    {
      id: "selectedOutstanding",
      labelKey: "finance.multiInvoicePayment.summary.selectedOutstanding",
      value: input.selectedOutstanding,
    },
  ];
}

/** Interpolate the pageIndicator template deterministically. */
export function formatPageIndicator(
  template: string,
  current: number,
  total: number,
): string {
  return template
    .replace("{{current}}", String(current))
    .replace("{{total}}", String(total));
}

/** Slice 3.3 — status → i18n key resolver used by the invoice status badge. */
const STATUS_KEYS: Record<string, string> = {
  draft: "draft",
  reviewed: "reviewed",
  approved: "approved",
  shared: "shared",
  issued: "issued",
  paid: "paid",
  partial: "partial",
  overdue: "overdue",
  cancelled: "cancelled",
  sent: "approved",
};

export function resolveInvoiceStatusKey(status: string | null | undefined): {
  key: string;
  known: boolean;
} {
  if (typeof status !== "string" || !status) return { key: "unknown", known: false };
  const mapped = STATUS_KEYS[status];
  if (!mapped) return { key: "unknown", known: false };
  return { key: mapped, known: true };
}
