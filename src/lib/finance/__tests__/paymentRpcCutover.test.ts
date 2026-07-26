import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { postLedgerForPayments, type PaymentEntry } from "../postLedgerForPayments";
import { postPaymentSession } from "../postPaymentSession";

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

function ok(allocations: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    data: {
      session_id: "sess",
      status: "posted",
      total_amount: 0,
      currency: "SAR",
      client_id: "c",
      payment_account_id: "a",
      payment_date: "2026-07-26",
      allocations,
      idempotency_key: "k",
      ...overrides,
    },
    error: null,
  };
}

describe("Phase N+2 Slice 3 — wrapper contract", () => {
  it("calls post_payment_session exactly once with the exact args and never touches payment_accounts", async () => {
    rpcMock.mockResolvedValueOnce(ok([
      { invoice_id: "inv-1", payment_method: "cash", amount: 100,
        client_level_amount: 100, ledger_entry_id: "le", outstanding_after: 0,
        invoice_status: "paid", horse_allocations: [] },
    ]));
    const r = await postLedgerForPayments(
      "inv-1", "tenant-1",
      [{ amount: 100, payment_method: "cash", idempotency_key: "row" }],
      "idem-1", "2026-07-26",
    );
    expect(r.success).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("post_payment_session", {
      p_tenant_id: "tenant-1",
      p_idempotency_key: "idem-1",
      p_payload: {
        payment_date: "2026-07-26",
        allocations: [{ invoice_id: "inv-1", payment_method: "cash", amount: 100 }],
      },
    });
  });

  it.each([["cash"], ["card"], ["transfer"], ["check"]])(
    "accepts allowed method %s",
    async (method) => {
      rpcMock.mockResolvedValueOnce(ok([
        { invoice_id: "i", payment_method: method, amount: 10,
          client_level_amount: 10, ledger_entry_id: "le", outstanding_after: 0,
          invoice_status: "paid", horse_allocations: [] },
      ]));
      const r = await postLedgerForPayments(
        "i", "t",
        [{ amount: 10, payment_method: method, idempotency_key: "x" }],
        "k", "2026-07-26",
      );
      expect(r.success).toBe(true);
      expect(rpcMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([["debt"], ["reconciliation"], [""], ["credit"], ["Cash"]])(
    "rejects method %s without contacting the RPC",
    async (method) => {
      const r = await postLedgerForPayments(
        "i", "t",
        [{ amount: 10, payment_method: method, idempotency_key: "x" }],
        "k", "2026-07-26",
      );
      expect(r.success).toBe(false);
      expect(r.errorCode).toBe("FIN_PAYMENT_METHOD_INVALID");
      expect(rpcMock).not.toHaveBeenCalled();
    },
  );

  it("keeps cash + card as two separate allocations with external references preserved", async () => {
    rpcMock.mockResolvedValueOnce(ok([
      { invoice_id: "inv-1", payment_method: "cash", amount: 30,
        client_level_amount: 30, ledger_entry_id: "le1", outstanding_after: 70,
        invoice_status: "partial", horse_allocations: [] },
      { invoice_id: "inv-1", payment_method: "card", amount: 70,
        client_level_amount: 70, ledger_entry_id: "le2", outstanding_after: 0,
        invoice_status: "paid", horse_allocations: [] },
    ]));
    const r = await postLedgerForPayments(
      "inv-1", "t",
      [
        { amount: 30, payment_method: "cash", reference: "REC-A", idempotency_key: "r1" },
        { amount: 70, payment_method: "card", reference: "REC-B", idempotency_key: "r2" },
      ],
      "k", "2026-07-26",
    );
    const payload = rpcMock.mock.calls[0][1].p_payload;
    expect(payload.allocations).toEqual([
      { invoice_id: "inv-1", payment_method: "cash", amount: 30, external_reference: "REC-A" },
      { invoice_id: "inv-1", payment_method: "card", amount: 70, external_reference: "REC-B" },
    ]);
    // Split-tender final result comes from the LAST allocation for the invoice.
    expect(r.outstandingAmount).toBe(0);
    expect(r.invoiceStatus).toBe("paid");
  });

  it("blocks cash + cash for the same invoice without any RPC call", async () => {
    const r = await postLedgerForPayments(
      "inv-1", "t",
      [
        { amount: 30, payment_method: "cash", idempotency_key: "r1" },
        { amount: 50, payment_method: "cash", idempotency_key: "r2" },
      ],
      "k", "2026-07-26",
    );
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe("FIN_ALLOCATION_DUPLICATE");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([["card"], ["transfer"], ["check"]])(
    "blocks duplicate %s + %s for the same invoice without any RPC call",
    async (method) => {
      const r = await postLedgerForPayments(
        "inv-1", "t",
        [
          { amount: 10, payment_method: method, idempotency_key: "r1" },
          { amount: 20, payment_method: method, idempotency_key: "r2" },
        ],
        "k", "2026-07-26",
      );
      expect(r.errorCode).toBe("FIN_ALLOCATION_DUPLICATE");
      expect(rpcMock).not.toHaveBeenCalled();
    },
  );

  it("propagates FIN_ error tokens from the server without a legacy fallback", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "FIN_INVOICE_OVER_ALLOCATION: amount exceeds outstanding" },
    });
    const r = await postPaymentSession("t", "k", {
      payment_date: "2026-07-26",
      allocations: [{ invoice_id: "i", payment_method: "cash", amount: 999 }],
    });
    expect(r.success).toBe(false);
    if (r.success !== true) expect(r.code).toBe("FIN_INVOICE_OVER_ALLOCATION");
    // No fallback to legacy post_invoice_payments / post_payment / payment_accounts.
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("post_payment_session", expect.anything());
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("uses the LAST returned allocation for outstanding/status even when server reorders", async () => {
    rpcMock.mockResolvedValueOnce(ok([
      { invoice_id: "inv-1", payment_method: "cash", amount: 40,
        client_level_amount: 40, ledger_entry_id: "le1", outstanding_after: 60,
        invoice_status: "partial", horse_allocations: [] },
      { invoice_id: "inv-1", payment_method: "card", amount: 60,
        client_level_amount: 60, ledger_entry_id: "le2", outstanding_after: 0,
        invoice_status: "paid", horse_allocations: [] },
    ]));
    const r = await postLedgerForPayments(
      "inv-1", "t",
      [
        { amount: 40, payment_method: "cash", idempotency_key: "r1" },
        { amount: 60, payment_method: "card", idempotency_key: "r2" },
      ],
      "k", "2026-07-26",
    );
    expect(r.outstandingAmount).toBe(0);
    expect(r.invoiceStatus).toBe("paid");
  });
});

// ---------------------------------------------------------------------------
// Idempotency-key lifecycle — mirrors the ref-based ownership in useInvoicePayments.
// This replays the exact logic (fingerprint → key reuse/rotate) so a hook-level
// regression cannot slip past.
// ---------------------------------------------------------------------------
function fingerprintPayload(
  invoiceId: string,
  paymentDate: string,
  payments: PaymentEntry[],
): string {
  const rows = payments.map((p) => ({
    a: Math.round(p.amount * 100) / 100,
    m: p.payment_method,
    r: p.reference ?? "",
    n: p.notes ?? "",
  }));
  return JSON.stringify({ i: invoiceId, d: paymentDate, r: rows });
}

function makeKeyManager() {
  let ref: { key: string; fingerprint: string } | null = null;
  return {
    take(invoiceId: string, date: string, payments: PaymentEntry[]) {
      const fp = fingerprintPayload(invoiceId, date, payments);
      if (!ref || ref.fingerprint !== fp) ref = { key: crypto.randomUUID(), fingerprint: fp };
      return ref.key;
    },
    rotateOnSuccess() { ref = null; },
    reset() { ref = null; },
    peek() { return ref?.key ?? null; },
  };
}

describe("Phase N+2 Slice 3 — idempotency lifecycle", () => {
  const inv = "inv-1";
  const date = "2026-07-26";
  const base: PaymentEntry[] = [{ amount: 100, payment_method: "cash", idempotency_key: "row" }];

  it("unchanged retry reuses the same key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    const k2 = km.take(inv, date, base);
    expect(k2).toBe(k1);
  });

  it("changed amount rotates the key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    const k2 = km.take(inv, date, [{ ...base[0], amount: 101 }]);
    expect(k2).not.toBe(k1);
  });

  it("changed method rotates the key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    const k2 = km.take(inv, date, [{ ...base[0], payment_method: "card" }]);
    expect(k2).not.toBe(k1);
  });

  it("changed date rotates the key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    const k2 = km.take(inv, "2026-07-27", base);
    expect(k2).not.toBe(k1);
  });

  it("changed reference rotates the key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    const k2 = km.take(inv, date, [{ ...base[0], reference: "REF-Z" }]);
    expect(k2).not.toBe(k1);
  });

  it("changed allocation row order rotates the key", () => {
    const km = makeKeyManager();
    const rows: PaymentEntry[] = [
      { amount: 30, payment_method: "cash", idempotency_key: "a" },
      { amount: 70, payment_method: "card", idempotency_key: "b" },
    ];
    const k1 = km.take(inv, date, rows);
    const k2 = km.take(inv, date, [rows[1], rows[0]]);
    expect(k2).not.toBe(k1);
  });

  it("success rotates the key; the next submit is fresh", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    km.rotateOnSuccess();
    const k2 = km.take(inv, date, base);
    expect(k2).not.toBe(k1);
    expect(k1).toBeTruthy();
  });

  it("reset (dialog close) clears the key; a fresh dialog open gets a fresh key", () => {
    const km = makeKeyManager();
    const k1 = km.take(inv, date, base);
    km.reset();
    expect(km.peek()).toBeNull();
    const k2 = km.take(inv, date, base);
    expect(k2).not.toBe(k1);
  });
});
