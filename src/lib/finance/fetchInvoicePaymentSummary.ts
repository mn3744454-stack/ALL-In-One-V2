import { supabase } from "@/integrations/supabase/client";

/**
 * Just-in-time payment summary loader used by the Print/Download PDF path.
 *
 * Mirrors the ledger-truth query in `useInvoicePayments` so the PDF snapshot
 * always reflects the same paid/outstanding numbers the on-screen drawer
 * shows. Reads from `ledger_entries` (payment source of truth) rather than
 * derived invoice status columns.
 */
export interface InvoicePaymentRowForPdf {
  id: string;
  amount: number;
  payment_method: string | null;
  effective_date: string | null;
  created_at: string | null;
  reference: string | null;
}

export interface InvoicePaymentSummaryForPdf {
  status: "unpaid" | "partial" | "paid";
  paidAmount: number;
  outstandingAmount: number;
  totalAmount: number;
  payments: InvoicePaymentRowForPdf[];
}

export async function fetchInvoicePaymentSummaryForPdf(
  tenantId: string,
  invoiceId: string,
): Promise<InvoicePaymentSummaryForPdf | null> {
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invErr || !invoice) return null;

  const { data: payments, error: payErr } = await supabase
    .from("ledger_entries")
    .select("id, amount, payment_method, effective_date, created_at, description")
    .eq("tenant_id", tenantId)
    .eq("reference_type", "invoice")
    .eq("reference_id", invoiceId)
    .eq("entry_type", "payment")
    .order("effective_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (payErr) return null;

  const rows: InvoicePaymentRowForPdf[] = (payments ?? []).map((p: any) => ({
    id: p.id,
    amount: Math.abs(Number(p.amount)),
    payment_method: p.payment_method ?? null,
    effective_date: p.effective_date ?? null,
    created_at: p.created_at ?? null,
    reference: p.description ?? null,
  }));

  const totalAmount = Number(invoice.total_amount) || 0;
  const paidAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const outstandingAmount = Math.max(0, totalAmount - paidAmount);
  const status: "unpaid" | "partial" | "paid" =
    outstandingAmount <= 0.01 && paidAmount > 0
      ? "paid"
      : paidAmount > 0
        ? "partial"
        : "unpaid";

  return { status, paidAmount, outstandingAmount, totalAmount, payments: rows };
}
