/**
 * Deterministic fingerprint for multi-invoice payment sessions.
 *
 * Feeds into the finance idempotency envelope: identical fingerprints must
 * yield the same idempotency key so a re-submit collides with the first
 * successful post_payment_session and returns the recorded response.
 *
 * The fingerprint is stable under key-order changes but sensitive to any
 * amount, invoice, tender, or per-row reference change. The session-level
 * "general reference" was removed in Slice 3.1 — per-tender references
 * remain authoritative via payment_allocations.external_reference and are
 * already sorted into the canonical string below.
 */
import type { PaymentSessionAllocation } from "./postPaymentSession";

function sortObjectKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortObjectKeys) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortObjectKeys((value as Record<string, unknown>)[k]);
    }
    return out as unknown as T;
  }
  return value;
}

export function buildMultiInvoiceFingerprint(input: {
  tenantId: string;
  clientId: string;
  currency: string;
  paymentDate: string;
  allocations: PaymentSessionAllocation[];
}): string {
  const normalizedAllocations = [...input.allocations]
    .map((a) => sortObjectKeys(a))
    .sort((a, b) => {
      const kA = `${(a as any).invoice_id}|${(a as any).payment_method}|${(a as any).external_reference ?? ""}`;
      const kB = `${(b as any).invoice_id}|${(b as any).payment_method}|${(b as any).external_reference ?? ""}`;
      return kA.localeCompare(kB);
    });
  const canonical = {
    v: 2,
    tenant_id: input.tenantId,
    client_id: input.clientId,
    currency: input.currency,
    payment_date: input.paymentDate,
    allocations: normalizedAllocations,
  };
  return JSON.stringify(sortObjectKeys(canonical));
}

export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function buildMultiInvoiceIdempotencyKey(input: {
  tenantId: string;
  clientId: string;
  currency: string;
  paymentDate: string;
  allocations: PaymentSessionAllocation[];
}): string {
  const canonical = buildMultiInvoiceFingerprint(input);
  return `mip:${input.clientId}:${input.paymentDate}:${fnv1a(canonical)}`;
}
