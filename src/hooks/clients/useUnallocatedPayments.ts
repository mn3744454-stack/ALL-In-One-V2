/**
 * Slice 2 Correction 2+3 — Customer-level (unallocated) activity.
 *
 * Classification contract (evidence-based; no allocation engine):
 *   • Explicitly allocated → ledger row has reference_type='invoice' AND
 *     reference_id points to a real invoice (any status). These rows are
 *     attributable to a specific invoice (and therefore to horses/categories
 *     via invoice_items) and MUST NOT appear here.
 *   • Customer-level unallocated → payment / credit / adjustment / invoice
 *     rows that have no resolvable invoice reference (reference_id is NULL
 *     or the referenced invoice no longer exists). These are surfaced as
 *     customer-wide movements only.
 *   • Cancellation adjustments (reference_type='invoice_cancellation') are
 *     excluded from the unallocated section (they are shown inline with
 *     the cancelled invoice's history in the main statement).
 *
 * READ-ONLY. This hook does not infer allocation, does not apply FIFO, and
 * never mutates ledger rows.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface UnallocatedEntry {
  id: string;
  date: string;
  entry_type: "invoice" | "payment" | "credit" | "adjustment";
  description: string | null;
  amount: number;          // signed as stored
  debit: number;           // presentation
  credit: number;          // presentation
  reference_type: string | null;
  payment_method: string | null;
  classification: "customer_level" | "unresolved_legacy";
}

export interface UnallocatedPaymentsSummary {
  count: number;
  totalAmount: number;
  entries: UnallocatedEntry[];
}

export function useUnallocatedPayments(
  clientId?: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: [
      "client-unallocated-activity",
      tenantId,
      clientId,
      dateFrom ?? null,
      dateTo ?? null,
    ],
    queryFn: async (): Promise<UnallocatedPaymentsSummary> => {
      if (!tenantId || !clientId) {
        return { count: 0, totalAmount: 0, entries: [] };
      }
      let q = supabase
        .from("ledger_entries")
        .select(
          "id, created_at, entry_type, description, amount, reference_type, reference_id, payment_method"
        )
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .neq("reference_type", "invoice_cancellation")
        .order("created_at", { ascending: true });
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59.999Z");
      const { data: rows, error } = await q;
      if (error || !rows) return { count: 0, totalAmount: 0, entries: [] };

      // Resolve which referenced invoices actually exist so unresolved legacy
      // rows are treated as customer-level activity.
      const invoiceIds = Array.from(
        new Set(
          rows
            .filter((r: any) => r.reference_type === "invoice" && r.reference_id)
            .map((r: any) => r.reference_id as string)
        )
      );
      let existingInvoiceIds = new Set<string>();
      if (invoiceIds.length > 0) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("id")
          .in("id", invoiceIds);
        existingInvoiceIds = new Set((inv || []).map((i: any) => i.id));
      }

      const entries: UnallocatedEntry[] = [];
      for (const r of rows as any[]) {
        const hasResolvedInvoice =
          r.reference_type === "invoice" &&
          r.reference_id &&
          existingInvoiceIds.has(r.reference_id);
        if (hasResolvedInvoice) continue; // explicitly allocated to an invoice
        const classification: UnallocatedEntry["classification"] =
          r.reference_type === "invoice" && r.reference_id
            ? "unresolved_legacy"
            : "customer_level";
        const amount = Number(r.amount || 0);
        entries.push({
          id: r.id,
          date: r.created_at,
          entry_type: r.entry_type,
          description: r.description,
          amount,
          debit: amount > 0 ? amount : 0,
          credit: amount < 0 ? Math.abs(amount) : 0,
          reference_type: r.reference_type,
          payment_method: r.payment_method,
          classification,
        });
      }

      const total = entries.reduce((s, e) => s + Math.abs(e.amount), 0);
      return { count: entries.length, totalAmount: total, entries };
    },
    enabled: !!tenantId && !!clientId,
    staleTime: 60_000,
  });

  return {
    unallocated: data ?? { count: 0, totalAmount: 0, entries: [] },
    isLoading,
  };
}
