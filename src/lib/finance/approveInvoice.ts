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
  // 1. Update status
  const { error } = await supabase
    .from("invoices" as any)
    .update({ status: "approved" })
    .eq("id", invoiceId);
  if (error) throw error;

  // 2. Post to ledger (idempotent — checks for existing entry)
  // Fetch client_id to determine if ledger posting is needed
  const { data: inv } = await supabase
    .from("invoices" as any)
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if ((inv as any)?.client_id) {
    await postLedgerForInvoice(invoiceId, tenantId);
  }
}
