import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "cash" | "card" | "transfer" | "check";

export interface PaymentHorseAllocation {
  horse_id: string;
  amount: number;
}

export interface PaymentSessionAllocation {
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: number;
  client_level_amount?: number;
  horse_allocations?: PaymentHorseAllocation[];
  external_reference?: string;
}

export interface PaymentSessionPayload {
  payment_date: string; // YYYY-MM-DD
  reference_note?: string;
  external_reference?: string;
  allocations: PaymentSessionAllocation[];
}

export interface PaymentSessionAllocationResult {
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: number;
  client_level_amount: number;
  ledger_entry_id: string;
  outstanding_after: number;
  invoice_status: string;
  horse_allocations: PaymentHorseAllocation[];
}

export interface PaymentSessionResponse {
  session_id: string;
  status: string;
  total_amount: number;
  currency: string;
  client_id: string;
  payment_account_id: string;
  payment_date: string;
  allocations: PaymentSessionAllocationResult[];
  idempotency_key: string;
}

export type PostPaymentSessionResult =
  | { success: true; response: PaymentSessionResponse }
  | { success: false; code: string; message: string };

const FIN_CODE_REGEX = /FIN_[A-Z_]+/;

function normalizeError(err: unknown): { code: string; message: string } {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : String(err ?? "");
  const match = raw.match(FIN_CODE_REGEX);
  const code = match ? match[0] : "FIN_UNKNOWN";
  return { code, message: raw || code };
}

/**
 * Thin wrapper over public.post_payment_session.
 *
 * The wrapper NEVER:
 * - looks up payment_accounts on the client,
 * - sends client_id, currency, session_id, outstanding, or ledger ids,
 * - falls back to any legacy writer.
 */
export async function postPaymentSession(
  tenantId: string,
  idempotencyKey: string,
  payload: PaymentSessionPayload,
): Promise<PostPaymentSessionResult> {
  try {
    const { data, error } = await supabase.rpc("post_payment_session", {
      p_tenant_id: tenantId,
      p_idempotency_key: idempotencyKey,
      // Supabase-generated `Json` is a recursive union; JSON-encoded payload conforms.
      p_payload: JSON.parse(JSON.stringify(payload)),
    });
    if (error) {
      if (import.meta.env.DEV) console.error("postPaymentSession error", error);
      const { code, message } = normalizeError(error);
      return { success: false, code, message };
    }
    return { success: true, response: data as unknown as PaymentSessionResponse };
  } catch (err) {
    if (import.meta.env.DEV) console.error("postPaymentSession threw", err);
    const { code, message } = normalizeError(err);
    return { success: false, code, message };
  }
}
