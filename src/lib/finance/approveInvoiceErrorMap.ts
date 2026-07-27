/**
 * Slice 2.2A — actionable, localized approval errors.
 *
 * Maps backend RAISE EXCEPTION codes emitted by
 * `_finance_invoice_approve_inline` / `_finance_invoice_compute_totals`
 * to translation keys under `finance.invoices.approveErrors.*`.
 *
 * Callers pass the caught error and the i18n `t` function; a human
 * readable, actionable message is returned. Unknown errors fall back to
 * a generic approval failure message rather than a bare `common.error`
 * toast so operators know which invoice action failed.
 */
type TFn = (key: string) => string;

const CODE_TO_KEY: Record<string, string> = {
  FIN_INVOICE_SOURCE_SNAPSHOT_STALE: "finance.invoices.approveErrors.sourceSnapshotStale",
  FIN_INVOICE_TOTALS_STALE: "finance.invoices.approveErrors.totalsStale",
  FIN_INVOICE_NOT_APPROVABLE: "finance.invoices.approveErrors.notApprovable",
  FIN_INVOICE_ITEMS_INVALID: "finance.invoices.approveErrors.itemsInvalid",
  FIN_ITEMS_EMPTY: "finance.invoices.approveErrors.itemsEmpty",
  // Slice 2.2B — payload-shape drift between frontend and installed whitelist.
  // Kept opaque to end users; instructs a refresh + support escalation.
  FIN_PAYLOAD_UNKNOWN_KEY: "finance.invoices.approveErrors.payloadUnknownKey",
};

export function approveInvoiceErrorMessage(error: unknown, t: TFn): string {
  const raw =
    (error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "")) || "";
  for (const code of Object.keys(CODE_TO_KEY)) {
    if (raw.includes(code)) return t(CODE_TO_KEY[code]);
  }
  return t("finance.invoices.approveErrors.generic");
}
