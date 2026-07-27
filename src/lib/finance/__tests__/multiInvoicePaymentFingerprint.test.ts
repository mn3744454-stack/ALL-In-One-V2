import { describe, expect, it } from "vitest";
import {
  buildMultiInvoiceFingerprint,
  buildMultiInvoiceIdempotencyKey,
  fnv1a,
} from "../multiInvoicePaymentFingerprint";
import type { PaymentSessionAllocation } from "../postPaymentSession";

const base = {
  tenantId: "T1",
  clientId: "C1",
  currency: "SAR",
  paymentDate: "2026-07-27",
};

const allocations: PaymentSessionAllocation[] = [
  { invoice_id: "inv-1", payment_method: "cash", amount: 100 },
  { invoice_id: "inv-2", payment_method: "transfer", amount: 50, external_reference: "TXN" },
];

describe("multiInvoicePaymentFingerprint", () => {
  it("produces identical fingerprints regardless of allocation ordering or key order", () => {
    const a = buildMultiInvoiceFingerprint({ ...base, allocations });
    const b = buildMultiInvoiceFingerprint({
      ...base,
      allocations: [...allocations].reverse(),
    });
    expect(a).toBe(b);
  });
  it("rotates the fingerprint when any material input changes", () => {
    const a = buildMultiInvoiceIdempotencyKey({ ...base, allocations });
    const changed = buildMultiInvoiceIdempotencyKey({
      ...base,
      allocations: [
        { invoice_id: "inv-1", payment_method: "cash", amount: 101 },
        allocations[1],
      ],
    });
    expect(a).not.toBe(changed);
  });
  it("fnv1a is stable and produces 8-hex output", () => {
    expect(fnv1a("hello")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a("hello")).toBe(fnv1a("hello"));
  });
});
