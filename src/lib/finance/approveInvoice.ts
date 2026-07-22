import { approveInvoiceRpc } from "./invoiceRpc";

/**
 * Single source of truth for invoice approval.
 * Atomically validates totals, updates status, and posts the ledger row.
 * Must be used by ALL approval entry points (detail sheet, list, card).
 */
export async function approveInvoice(
  invoiceId: string,
  tenantId: string
): Promise<void> {
  await approveInvoiceRpc(tenantId, invoiceId);
}
