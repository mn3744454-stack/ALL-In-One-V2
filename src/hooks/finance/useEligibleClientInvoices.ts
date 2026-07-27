import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useInvoicePaymentsBatch } from "./useInvoicePaymentsBatch";

/**
 * Phase N+3 · Slice 3 — Multi-Invoice Client Payment.
 *
 * Batch-fetches every "payable" invoice for a single client together with its
 * live outstanding amount, its issue/due dates, and enough header information
 * to render the `EligibleInvoicesSelector` and drive the shared multi-invoice
 * dialog. Outstanding is derived from `ledger_entries` (source of truth) to
 * stay consistent with the single-invoice hook and PDF summary.
 *
 * "Payable" here excludes `draft`, `paid`, and `cancelled` invoices. Only
 * invoices with a positive outstanding amount are returned.
 */

const PAYABLE_STATUSES = [
  "approved",
  "shared",
  "partial",
  "overdue",
  "issued",
  "reviewed",
] as const;

export interface EligibleInvoice {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total_amount: number;
  paid_amount: number;
  outstanding: number;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
}

interface UseEligibleClientInvoicesArgs {
  clientId?: string | null;
  currency?: string | null;
}

export function useEligibleClientInvoices({ clientId, currency }: UseEligibleClientInvoicesArgs) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const invoicesQuery = useQuery({
    queryKey: ["eligible-client-invoices", tenantId, clientId, currency ?? null],
    enabled: !!tenantId && !!clientId,
    queryFn: async () => {
      if (!tenantId || !clientId) return [] as Array<{
        id: string;
        invoice_number: string;
        status: string;
        currency: string;
        total_amount: number;
        issue_date: string;
        due_date: string | null;
        notes: string | null;
      }>;
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, status, currency, total_amount, issue_date, due_date, notes")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .in("status", PAYABLE_STATUSES as unknown as string[])
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("issue_date", { ascending: true })
        .order("invoice_number", { ascending: true });
      if (currency) query = query.eq("currency", currency);
      const { data, error } = await query;
      if (error) {
        console.error("useEligibleClientInvoices header", error);
        return [];
      }
      return (data ?? []) as any;
    },
  });

  const headerRows = invoicesQuery.data ?? [];
  const invoiceIds = useMemo(() => headerRows.map((r: any) => r.id as string), [headerRows]);
  const { getPaidAmount, isLoading: isLoadingPaid } = useInvoicePaymentsBatch(invoiceIds);

  const invoices: EligibleInvoice[] = useMemo(() => {
    const out: EligibleInvoice[] = [];
    for (const r of headerRows as any[]) {
      const total = Number(r.total_amount) || 0;
      const paid = getPaidAmount(r.id) || 0;
      const outstanding = Math.max(0, Math.round((total - paid) * 100) / 100);
      if (outstanding <= 0) continue;
      out.push({
        id: r.id,
        invoice_number: r.invoice_number,
        status: r.status,
        currency: r.currency ?? currency ?? "SAR",
        total_amount: total,
        paid_amount: Math.round(paid * 100) / 100,
        outstanding,
        issue_date: r.issue_date,
        due_date: r.due_date ?? null,
        notes: r.notes ?? null,
      });
    }
    return out;
  }, [headerRows, getPaidAmount, currency]);

  return {
    invoices,
    isLoading: invoicesQuery.isLoading || isLoadingPaid,
    refetch: invoicesQuery.refetch,
  };
}
