import { supabase } from "@/integrations/supabase/client";

/**
 * Just-in-time payment summary loader used by the Print/Download PDF path.
 *
 * Mirrors the ledger-truth query in `useInvoicePayments` so the PDF snapshot
 * always reflects the same paid/outstanding numbers the on-screen drawer
 * shows. Reads from `ledger_entries` (payment source of truth) rather than
 * derived invoice status columns.
 *
 * Phase N+3 Slice 2.1: also enriches each row with `payment_session_id` and
 * — where available — the horse/client-level distribution that was recorded
 * for that session, so the PDF can group tenders by Payment Session and
 * disclose the per-horse allocation exactly as the on-screen editor produced.
 * Historical rows without a `payment_session_id` fall into a single
 * "Historical Payments" bucket to preserve backward compatibility.
 */
export interface InvoicePaymentHorseAllocationForPdf {
  horseId: string;
  horseName: string;
  horseNameAr: string | null;
  amount: number;
}

export interface InvoicePaymentSessionForPdf {
  /** null → legacy/pre-session ledger rows */
  sessionId: string | null;
  effectiveDate: string | null;
  createdAt: string | null;
  totalAmount: number;
  /** One row per tender/method inside the session, in insertion order. */
  tenders: InvoicePaymentRowForPdf[];
  /** Horse-scoped distribution for this session; empty when RPC did not persist any. */
  horseAllocations: InvoicePaymentHorseAllocationForPdf[];
  /** Client-level portion for this session (0 if none). */
  clientLevelAmount: number;
}

export interface InvoicePaymentRowForPdf {
  id: string;
  amount: number;
  payment_method: string | null;
  effective_date: string | null;
  created_at: string | null;
  reference: string | null;
  payment_session_id?: string | null;
}

export interface InvoicePaymentSummaryForPdf {
  status: "unpaid" | "partial" | "paid";
  paidAmount: number;
  outstandingAmount: number;
  totalAmount: number;
  payments: InvoicePaymentRowForPdf[];
  /** Payment rows regrouped by session for grouped disclosure. Optional
   *  so legacy call sites/tests that predate Slice 2.1 keep compiling. */
  sessions?: InvoicePaymentSessionForPdf[];
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
    .select("id, amount, payment_method, effective_date, created_at, description, payment_session_id")
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
    payment_session_id: p.payment_session_id ?? null,
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

  // Fetch persisted allocations for known session IDs.
  const sessionIds = Array.from(
    new Set(rows.map((r) => r.payment_session_id).filter((x): x is string => !!x)),
  );
  const allocByKey = new Map<string, { horseId: string; amount: number }[]>();
  const clientByKey = new Map<string, number>();
  const horseIds = new Set<string>();
  if (sessionIds.length > 0) {
    // Slice 2.2A: fetch allocations and horse allocations as two flat queries
    // instead of a PostgREST embedded read. `payment_horse_allocations` uses
    // a composite FK to `payment_allocations` which PostgREST does not
    // resolve automatically, so the embedded shape returned an empty
    // `payment_horse_allocations` array and dropped the horse distribution
    // from the PDF.
    const { data: allocations, error: allocErr } = await supabase
      .from("payment_allocations")
      .select("id, session_id, invoice_id, client_level_amount")
      .eq("tenant_id", tenantId)
      .eq("invoice_id", invoiceId)
      .in("session_id", sessionIds);
    if (allocErr) {
      // Slice 2.2B: a failed allocation read is a runtime/permission defect,
      // not a "no distribution" signal. Throw so the caller's Print/Download
      // handler can block generation and surface a localized fetch error —
      // never silently produce an incomplete Payment History.
      if (import.meta.env.DEV) {
        console.error("[fetchInvoicePaymentSummaryForPdf] payment_allocations read failed", allocErr);
      }
      throw new Error("FIN_PDF_PAYMENT_ALLOCATIONS_READ_FAILED");
    }
    const allocRows = (allocations ?? []) as Array<{
      id: string;
      session_id: string;
      client_level_amount: number | string | null;
    }>;
    const allocIdToSession = new Map<string, string>();
    for (const a of allocRows) {
      allocIdToSession.set(a.id, a.session_id);
      const cl = Number(a.client_level_amount) || 0;
      if (cl > 0) clientByKey.set(a.session_id, (clientByKey.get(a.session_id) ?? 0) + cl);
    }
    if (allocIdToSession.size > 0) {
      const { data: horseAllocs, error: horseAllocErr } = await supabase
        .from("payment_horse_allocations")
        .select("allocation_id, horse_id, amount")
        .eq("tenant_id", tenantId)
        .in("allocation_id", Array.from(allocIdToSession.keys()));
      if (horseAllocErr) {
        if (import.meta.env.DEV) {
          console.error(
            "[fetchInvoicePaymentSummaryForPdf] payment_horse_allocations read failed",
            horseAllocErr,
          );
        }
        throw new Error("FIN_PDF_PAYMENT_HORSE_ALLOCATIONS_READ_FAILED");
      }
      for (const ha of (horseAllocs ?? []) as Array<{
        allocation_id: string;
        horse_id: string;
        amount: number | string;
      }>) {
        const sessionId = allocIdToSession.get(ha.allocation_id);
        if (!sessionId) continue;
        const amt = Number(ha.amount) || 0;
        if (amt <= 0) continue;
        const list = allocByKey.get(sessionId) ?? [];
        list.push({ horseId: ha.horse_id, amount: amt });
        allocByKey.set(sessionId, list);
        horseIds.add(ha.horse_id);
      }
    }
  }

  const horseNames = new Map<string, { name: string; name_ar: string | null }>();
  if (horseIds.size > 0) {
    const { data: horses } = await supabase
      .from("horses")
      .select("id, name, name_ar")
      .in("id", Array.from(horseIds));
    for (const h of horses ?? []) {
      horseNames.set(h.id, { name: h.name ?? h.id.slice(0, 8), name_ar: h.name_ar ?? null });
    }
  }

  // Group tenders by session_id (null → legacy bucket).
  const byKey = new Map<string, InvoicePaymentRowForPdf[]>();
  for (const r of rows) {
    const key = r.payment_session_id ?? "__legacy__";
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  const sessions: InvoicePaymentSessionForPdf[] = Array.from(byKey.entries()).map(
    ([key, tenders]) => {
      const sessionId = key === "__legacy__" ? null : key;
      const first = tenders[0];
      const persisted = sessionId ? (allocByKey.get(sessionId) ?? []) : [];
      // Aggregate multi-row horse allocations by horseId.
      const perHorse = new Map<string, number>();
      for (const h of persisted) perHorse.set(h.horseId, (perHorse.get(h.horseId) ?? 0) + h.amount);
      const horseAllocations: InvoicePaymentHorseAllocationForPdf[] = Array.from(
        perHorse.entries(),
      ).map(([horseId, amount]) => {
        const info = horseNames.get(horseId);
        return {
          horseId,
          horseName: info?.name ?? horseId.slice(0, 8),
          horseNameAr: info?.name_ar ?? null,
          amount,
        };
      });
      return {
        sessionId,
        effectiveDate: first?.effective_date ?? null,
        createdAt: first?.created_at ?? null,
        totalAmount: tenders.reduce((s, t) => s + t.amount, 0),
        tenders,
        horseAllocations,
        clientLevelAmount: sessionId ? (clientByKey.get(sessionId) ?? 0) : 0,
      };
    },
  );

  return {
    status,
    paidAmount,
    outstandingAmount,
    totalAmount,
    payments: rows,
    sessions,
  };
}
