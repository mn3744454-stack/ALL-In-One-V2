import { supabase } from "@/integrations/supabase/client";
import { postLedgerForInvoice } from "./postLedgerForInvoice";

/**
 * Single source of truth for invoice approval.
 * Updates status to 'approved' and posts to ledger (idempotent).
 * Must be used by ALL approval entry points (detail sheet, list, card).
 */
export async function approveInvoice(
  invoiceId: string,
  tenantId: string
): Promise<void> {
  // Fetch invoice to check amount and client
  const { data: inv } = await supabase
    .from("invoices" as any)
    .select("client_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  const totalAmount = Number((inv as any)?.total_amount) || 0;

  // 1. Update status to approved
  const { error } = await supabase
    .from("invoices" as any)
    .update({ status: "approved" })
    .eq("id", invoiceId);
  if (error) throw error;

  // 2. Post to ledger (idempotent) — skip zero-charge invoices
  // Zero-charge invoices (e.g., plan-included services) remain as
  // approved audit records but do not post to ledger/statements
  if ((inv as any)?.client_id && totalAmount > 0) {
    await postLedgerForInvoice(invoiceId, tenantId);
  }
}
