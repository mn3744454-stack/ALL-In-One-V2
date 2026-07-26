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
 * NO client-side payment_accounts lookup. NO legacy writer fallback.
 * Split-tender is preserved as one allocation per (invoice, method).
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

  // Merge same-method rows so the server's (invoice|method) dedupe holds.
  const byMethod = new Map<string, { amount: number; reference?: string }>();
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
    const cur = byMethod.get(p.payment_method);
    if (cur) {
      cur.amount += p.amount;
      if (!cur.reference && p.reference) cur.reference = p.reference;
    } else {
      byMethod.set(p.payment_method, { amount: p.amount, reference: p.reference });
    }
  }

  const allocations: PaymentSessionAllocation[] = Array.from(byMethod.entries()).map(([method, row]) => {
    const alloc: PaymentSessionAllocation = {
      invoice_id: invoiceId,
      payment_method: method as PaymentMethod,
      amount: Math.round(row.amount * 100) / 100,
    };
    if (row.reference) alloc.external_reference = row.reference;
    return alloc;
  });

  const result = await postPaymentSession(tenantId, paymentSessionId, {
    payment_date: paymentDate,
    allocations,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.message,
      errorCode: result.code,
      paidAmount: 0,
      outstandingAmount: 0,
      invoiceStatus: "",
    };
  }

  const alloc = result.response.allocations.find((a) => a.invoice_id === invoiceId)
    ?? result.response.allocations[0];
  const outstanding = Math.max(0, Number(alloc?.outstanding_after ?? 0));
  const status = String(alloc?.invoice_status ?? "");
  const paid = Math.max(0, total);
  return { success: true, paidAmount: paid, outstandingAmount: outstanding, invoiceStatus: status };
}
