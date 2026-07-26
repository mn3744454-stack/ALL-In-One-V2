import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { postLedgerForPayments } from "../postLedgerForPayments";
import { postPaymentSession } from "../postPaymentSession";

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe("Phase N+2 Slice 3 — payment RPC cutover", () => {
  it("postLedgerForPayments never queries payment_accounts and calls the RPC exactly once", async () => {
    rpcMock.mockResolvedValue({
      data: {
        session_id: "sess-1",
        status: "posted",
        total_amount: 100,
        currency: "SAR",
        client_id: "c1",
        payment_account_id: "acc-1",
        payment_date: "2026-07-26",
        allocations: [
          {
            invoice_id: "inv-1",
            payment_method: "cash",
            amount: 100,
            client_level_amount: 100,
            ledger_entry_id: "le-1",
            outstanding_after: 0,
            invoice_status: "paid",
            horse_allocations: [],
          },
        ],
        idempotency_key: "idem-1",
      },
      error: null,
    });

    const result = await postLedgerForPayments(
      "inv-1",
      "tenant-1",
      [{ amount: 100, payment_method: "cash", idempotency_key: "row-1" }],
      "idem-1",
      "2026-07-26",
    );

    expect(result.success).toBe(true);
    expect(result.outstandingAmount).toBe(0);
    expect(result.invoiceStatus).toBe("paid");
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("post_payment_session", expect.objectContaining({
      p_tenant_id: "tenant-1",
      p_idempotency_key: "idem-1",
    }));
  });

  it("rejects unsupported payment methods before contacting the RPC", async () => {
    const result = await postLedgerForPayments(
      "inv-1",
      "tenant-1",
      [{ amount: 50, payment_method: "debt", idempotency_key: "row-1" }],
      "idem-2",
      "2026-07-26",
    );
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("FIN_PAYMENT_METHOD_INVALID");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("merges split-tender rows sharing the same method into one allocation", async () => {
    rpcMock.mockResolvedValue({
      data: {
        session_id: "sess",
        status: "posted",
        total_amount: 80,
        currency: "SAR",
        client_id: "c",
        payment_account_id: "a",
        payment_date: "2026-07-26",
        allocations: [
          { invoice_id: "inv-1", payment_method: "cash", amount: 80,
            client_level_amount: 80, ledger_entry_id: "le", outstanding_after: 20,
            invoice_status: "partial", horse_allocations: [] },
        ],
        idempotency_key: "k",
      },
      error: null,
    });
    await postLedgerForPayments(
      "inv-1", "tenant-1",
      [
        { amount: 30, payment_method: "cash", idempotency_key: "r1" },
        { amount: 50, payment_method: "cash", idempotency_key: "r2" },
      ],
      "k", "2026-07-26",
    );
    const payload = rpcMock.mock.calls[0][1].p_payload;
    expect(payload.allocations).toHaveLength(1);
    expect(payload.allocations[0].amount).toBe(80);
    expect(payload.allocations[0].payment_method).toBe("cash");
  });

  it("propagates FIN_ error tokens from the server", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "FIN_INVOICE_OVER_ALLOCATION: amount exceeds outstanding" },
    });
    const r = await postPaymentSession("t", "k", {
      payment_date: "2026-07-26",
      allocations: [{ invoice_id: "i", payment_method: "cash", amount: 999 }],
    });
    expect(r.success).toBe(false);
    if (r.success !== true) expect(r.code).toBe("FIN_INVOICE_OVER_ALLOCATION");
  });
});
