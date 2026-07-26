import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { postLedgerForPayments, type PaymentEntry } from "@/lib/finance/postLedgerForPayments";
import { invalidateFinanceQueries } from "./invalidateFinanceQueries";
import type { BucketAllocation } from "@/lib/finance/allocationDistribution";

/**
 * Canonical fingerprint for the payment payload. A stable fingerprint means the
 * same material inputs (invoice, date, ordered rows, ordered bucket splits) —
 * retrying an unchanged payload reuses the same idempotency key so the server
 * treats it as a replay. Any material change rotates the key on the next submit.
 */
function fingerprintPayload(
  invoiceId: string,
  paymentDate: string,
  payments: PaymentEntry[],
  bucketAllocations?: BucketAllocation[],
): string {
  const rows = payments.map((p) => ({
    a: Math.round(p.amount * 100) / 100,
    m: p.payment_method,
    r: p.reference ?? "",
    n: p.notes ?? "",
  }));
  const buckets = bucketAllocations
    ? [...bucketAllocations]
        .filter((b) => b.amount > 0)
        .map((b) => ({ k: b.key, t: b.kind, h: b.horseId ?? "", a: Math.round(b.amount * 100) / 100 }))
        .sort((x, y) => x.k.localeCompare(y.k))
    : [];
  return JSON.stringify({ i: invoiceId, d: paymentDate, r: rows, b: buckets });
}


export interface InvoicePayment {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_session_id: string | null;
  metadata: Record<string, unknown>;
  effective_date: string;
  created_at: string;
  description: string | null;
}

export interface InvoicePaymentSummary {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  payments: InvoicePayment[];
  isPaid: boolean;
  isPartial: boolean;
}

interface InvoiceHorseComposition {
  distinctHorses: number;
  hasClientLevel: boolean;
}

const ERROR_TOKEN_KEYS: Record<string, string> = {
  FIN_IDEMPOTENCY_CONFLICT: "finance.payments.errors.idempotencyConflict",
  FIN_INVOICE_OVER_ALLOCATION: "finance.payments.errors.overAllocation",
  FIN_INVOICE_NOT_PAYABLE: "finance.payments.errors.notPayable",
  FIN_INVOICE_CROSS_CLIENT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CROSS_TENANT: "finance.payments.errors.crossClient",
  FIN_INVOICE_CURRENCY_MISMATCH: "finance.payments.errors.crossClient",
  FIN_PAYMENT_ACCOUNT_MISSING: "finance.payments.errors.accountMissing",
  FIN_HORSE_ALLOCATION_REQUIRED: "finance.payments.errors.allocationRequired",
  FIN_HORSE_ALLOCATION_MISMATCH: "finance.payments.errors.allocationRequired",
  FIN_HORSE_NOT_ON_INVOICE: "finance.payments.errors.allocationRequired",
  FIN_CLIENT_LEVEL_ALLOCATION_INVALID: "finance.payments.errors.allocationRequired",
  FIN_ALLOCATION_HISTORY_UNRESOLVED: "finance.payments.errors.historyUnresolved",
  FIN_PERMISSION_DENIED: "finance.payments.errors.permissionDenied",
  FIN_UNAUTHENTICATED: "finance.payments.errors.permissionDenied",
  FIN_PAYMENT_METHOD_INVALID: "finance.payments.errors.methodInvalid",
  FIN_ALLOCATION_DUPLICATE: "finance.payments.errors.duplicateAllocation",
};

/**
 * Hook to fetch and manage payments for a specific invoice.
 * Computes paid/outstanding from ledger_entries (source of truth).
 *
 * Multi-horse and mixed invoices are gated to Phase 4 — the hook rejects them
 * before contacting the payment RPC to give the user a clean localized notice.
 */
export function useInvoicePayments(invoiceId?: string | null) {
  const { activeTenant } = useTenant();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoice-payments", tenantId, invoiceId],
    queryFn: async (): Promise<InvoicePaymentSummary | null> => {
      if (!tenantId || !invoiceId) return null;

      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("id", invoiceId)
        .single();

      if (invError || !invoice) {
        console.error("Error fetching invoice:", invError);
        return null;
      }

      const { data: payments, error: payError } = await supabase
        .from("ledger_entries")
        .select("id, amount, payment_method, payment_session_id, metadata, effective_date, created_at, description")
        .eq("tenant_id", tenantId)
        .eq("reference_type", "invoice")
        .eq("reference_id", invoiceId)
        .eq("entry_type", "payment")
        .order("effective_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (payError) {
        console.error("Error fetching payments:", payError);
        return null;
      }

      const paymentsList: InvoicePayment[] = (payments || []).map((p: any) => ({
        id: p.id,
        amount: Math.abs(Number(p.amount)),
        payment_method: p.payment_method,
        payment_session_id: p.payment_session_id,
        metadata: p.metadata || {},
        effective_date: p.effective_date || p.created_at.slice(0, 10),
        created_at: p.created_at,
        description: p.description,
      }));

      const totalAmount = Number(invoice.total_amount);
      const paidAmount = paymentsList.reduce((sum, p) => sum + p.amount, 0);
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);

      return {
        invoiceId,
        totalAmount,
        paidAmount,
        outstandingAmount,
        payments: paymentsList,
        isPaid: outstandingAmount <= 0.01,
        isPartial: paidAmount > 0 && outstandingAmount > 0.01,
      };
    },
    enabled: !!tenantId && !!invoiceId,
  });

  // Horse composition — used by the Phase-4 boundary gate.
  const { data: composition } = useQuery({
    queryKey: ["invoice-horse-composition", invoiceId],
    queryFn: async (): Promise<InvoiceHorseComposition | null> => {
      if (!invoiceId) return null;
      const { data: rows, error } = await supabase
        .from("invoice_items")
        .select("horse_id")
        .eq("invoice_id", invoiceId);
      if (error) {
        console.error("Error fetching invoice horse composition:", error);
        return null;
      }
      const horseIds = new Set<string>();
      let hasClientLevel = false;
      for (const r of rows || []) {
        const horseId = (r as { horse_id: string | null }).horse_id;
        if (horseId) horseIds.add(horseId);
        else hasClientLevel = true;
      }
      return { distinctHorses: horseIds.size, hasClientLevel };
    },
    enabled: !!invoiceId,
  });

  const requiresPhase4Allocation = composition
    ? composition.distinctHorses > 1 ||
      (composition.distinctHorses >= 1 && composition.hasClientLevel)
    : false;

  // Idempotency ownership: one key per canonical payload fingerprint.
  //   - unchanged retry after timeout/unknown response  → same key (server replays);
  //   - material change (invoice/date/method/amount/ref/allocation) → fresh key;
  //   - success → rotate to null;
  //   - dialog close / manual reset → clear.
  // Also serves as an in-flight guard: while a submit is running the ref holds
  // its key, so a double-click reuses the same key and the server dedupes.
  const idemRef = useRef<{ key: string; fingerprint: string } | null>(null);
  const inFlightRef = useRef<Promise<Awaited<ReturnType<typeof postLedgerForPayments>>> | null>(null);

  const resetIdempotency = useCallback(() => {
    idemRef.current = null;
    inFlightRef.current = null;
  }, []);

  const recordPaymentMutation = useMutation({
    mutationFn: async ({
      payments,
      paymentDate,
    }: {
      payments: PaymentEntry[];
      paymentDate: string;
    }) => {
      if (!tenantId || !invoiceId) {
        throw new Error("Missing tenant or invoice");
      }

      if (requiresPhase4Allocation) {
        const err = new Error("FIN_HORSE_ALLOCATION_REQUIRED");
        (err as Error & { code?: string }).code = "FIN_HORSE_ALLOCATION_REQUIRED";
        throw err;
      }

      const fingerprint = fingerprintPayload(invoiceId, paymentDate, payments);
      // Reuse the existing key when the payload is unchanged (retry). Rotate
      // when any material field changes.
      if (!idemRef.current || idemRef.current.fingerprint !== fingerprint) {
        idemRef.current = { key: crypto.randomUUID(), fingerprint };
      }
      const idempotencyKey = idemRef.current.key;

      // Coalesce concurrent submits (e.g. double-click) onto one RPC call.
      if (inFlightRef.current) {
        const shared = await inFlightRef.current;
        if (!shared.success) {
          const err = new Error(shared.error || "Failed to record payment");
          (err as Error & { code?: string }).code = shared.errorCode;
          throw err;
        }
        return shared;
      }

      const promise = postLedgerForPayments(
        invoiceId,
        tenantId,
        payments,
        idempotencyKey,
        paymentDate,
      );
      inFlightRef.current = promise;
      let result;
      try {
        result = await promise;
      } finally {
        inFlightRef.current = null;
      }

      if (!result.success) {
        const err = new Error(result.error || "Failed to record payment");
        (err as Error & { code?: string }).code = result.errorCode;
        throw err;
      }

      return result;
    },
    retry: 0,
    onSuccess: (result) => {
      // Success rotates the idempotency key so the next logical submit is a
      // fresh session, not a replay of the just-posted one.
      idemRef.current = null;
      toast({
        title: result.outstandingAmount <= 0.01
          ? t("finance.payments.fullyPaid")
          : `${t("finance.payments.recorded")} — ${t("finance.payments.outstanding")}: ${result.outstandingAmount.toFixed(2)}`,
      });
      invalidateFinanceQueries(queryClient, tenantId);
    },
    onError: (error: Error & { code?: string }) => {
      const code = error.code || error.message.match(/FIN_[A-Z_]+/)?.[0];
      const key = code ? ERROR_TOKEN_KEYS[code] : undefined;
      toast({
        title: key ? t(key) : t("finance.payments.errors.unknown"),
        variant: "destructive",
      });
      if (import.meta.env.DEV) console.error("Payment error:", error);
    },
  });

  return {
    summary: data,
    isLoading,
    refetch,
    recordPayment: recordPaymentMutation.mutateAsync,
    isRecording: recordPaymentMutation.isPending,
    requiresPhase4Allocation,
    resetIdempotency,
  };
}
