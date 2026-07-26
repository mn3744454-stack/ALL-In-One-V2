import {
  postPaymentSession,
  type PaymentMethod,
  type PaymentSessionAllocation,
} from "./postPaymentSession";

export interface PaymentEntry {
  amount: number;
  payment_method: string;
  idempotency_key: string;
  reference?: string;
  notes?: string;
}

export interface PostPaymentsResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  paidAmount: number;
  outstandingAmount: number;
  invoiceStatus: string;
}

const ALLOWED_METHODS: readonly PaymentMethod[] = ["cash", "card", "transfer", "check"] as const;

function isAllowedMethod(method: string): method is PaymentMethod {
  return (ALLOWED_METHODS as readonly string[]).includes(method);
}

/**
 * Frontend entry point for recording invoice payments.
 *
 * Delegates to public.post_payment_session via {@link postPaymentSession}.
 * The server owns tenant payment account resolution, currency, client identity,
 * outstanding recompute, ledger insertion, and invoice status.
 *
 * Split-tender contract (Phase N+2 Slice 3):
 *   - each row becomes its own allocation (no same-method merging);
 *   - duplicate (invoice, method) rows are rejected client-side WITHOUT
 *     contacting the RPC so the caller sees FIN_ALLOCATION_DUPLICATE without
 *     spending a server round-trip;
 *   - the returned outstanding/status come from the LAST allocation for the
 *     invoice in caller order — the frontmost tender is intermediate, the
 *     tail-most is authoritative.
 *
 * NO client-side payment_accounts lookup. NO legacy writer fallback.
 */
export async function postLedgerForPayments(
  invoiceId: string,
  tenantId: string,
  payments: PaymentEntry[],
  paymentSessionId: string,
  paymentDate: string,
): Promise<PostPaymentsResult> {
  if (!payments.length) {
    return { success: false, error: "No payments provided", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
  }
  const total = payments.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) {
    return { success: false, error: "Payment amount must be positive", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
  }

  // Method allowlist mirror of the backend guard.
  for (const p of payments) {
    if (!isAllowedMethod(p.payment_method)) {
      return {
        success: false,
        error: "Unsupported payment method",
        errorCode: "FIN_PAYMENT_METHOD_INVALID",
        paidAmount: 0,
        outstandingAmount: 0,
        invoiceStatus: "",
      };
    }
  }

  // Reject duplicate methods for the same invoice BEFORE the RPC call.
  const seenMethods = new Set<string>();
  for (const p of payments) {
    if (seenMethods.has(p.payment_method)) {
      return {
        success: false,
        error: "Duplicate payment method for the same invoice",
        errorCode: "FIN_ALLOCATION_DUPLICATE",
        paidAmount: 0,
        outstandingAmount: 0,
        invoiceStatus: "",
      };
    }
    seenMethods.add(p.payment_method);
  }

  // One allocation per row, order preserved — external references stay attached.
  const allocations: PaymentSessionAllocation[] = payments.map((p) => {
    const alloc: PaymentSessionAllocation = {
      invoice_id: invoiceId,
      payment_method: p.payment_method as PaymentMethod,
      amount: Math.round(p.amount * 100) / 100,
    };
    if (p.reference) alloc.external_reference = p.reference;
    return alloc;
  });

  const result = await postPaymentSession(tenantId, paymentSessionId, {
    payment_date: paymentDate,
    allocations,
  });

  if (result.success !== true) {
    return {
      success: false,
      error: result.message,
      errorCode: result.code,
      paidAmount: 0,
      outstandingAmount: 0,
      invoiceStatus: "",
    };
  }

  // LAST allocation for this invoice is authoritative (final outstanding/status).
  const invoiceAllocs = result.response.allocations.filter((a) => a.invoice_id === invoiceId);
  const finalAlloc = invoiceAllocs.length
    ? invoiceAllocs[invoiceAllocs.length - 1]
    : result.response.allocations[result.response.allocations.length - 1];
  const outstanding = Math.max(0, Number(finalAlloc?.outstanding_after ?? 0));
  const status = String(finalAlloc?.invoice_status ?? "");
  return { success: true, paidAmount: Math.max(0, total), outstandingAmount: outstanding, invoiceStatus: status };
}
