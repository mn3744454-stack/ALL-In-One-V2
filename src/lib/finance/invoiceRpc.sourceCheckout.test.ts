import { describe, it, expect, vi, beforeEach } from "vitest";

// -- Supabase client mock ----------------------------------------------------
const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  createSourceCheckoutInvoice,
  type SourceCheckoutPayload,
  type LabSampleCheckoutPayload,
  type HorseOrderCheckoutPayload,
} from "@/lib/finance/invoiceRpc";

const TENANT = "145f2128-83ca-4ba8-85b5-8ade245c5530";
const IDEM = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const SRC = "66666666-6666-6666-6666-666666666666";

const OK_RESULT = {
  invoice_id: "11111111-1111-1111-1111-111111111111",
  invoice_number: "INV-1",
  subtotal: 100,
  tax_amount: 15,
  discount_amount: 0,
  total_amount: 115,
  prices_include_tax: false,
  currency: "SAR",
  status: "paid",
  payment_method: "cash",
  client_id: null,
  client_name: "Walk-in",
  source_type: "lab_sample",
  source_id: SRC,
  source_link_kind: "final",
  source_billing_link_id: "22222222-2222-2222-2222-222222222222",
  payment_result: null,
};

const RESULT_KEYS = new Set(Object.keys(OK_RESULT));

beforeEach(() => rpcMock.mockReset());

describe("createSourceCheckoutInvoice wrapper", () => {
  it("calls the exact RPC name with tenant + explicit idempotency key + payload", async () => {
    rpcMock.mockResolvedValue({ data: OK_RESULT, error: null });
    const payload: LabSampleCheckoutPayload = {
      source_type: "lab_sample",
      source_id: SRC,
      link_kind: "final",
      payment_method: "cash",
      items: [{ description: "x", quantity: 1, unit_price: 10, is_taxable: true }],
    };
    await createSourceCheckoutInvoice(TENANT, IDEM, payload);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [name, args] = rpcMock.mock.calls[0];
    expect(name).toBe("create_source_checkout_invoice");
    expect(args.p_tenant_id).toBe(TENANT);
    expect(args.p_idempotency_key).toBe(IDEM);
    expect(args.p_payload.source_type).toBe("lab_sample");
    expect(args.p_payload.link_kind).toBe("final");
    expect(args.p_payload.items).toHaveLength(1);
  });

  it("omits prices_include_tax when undefined and preserves explicit boolean", async () => {
    rpcMock.mockResolvedValue({ data: OK_RESULT, error: null });
    const base: LabSampleCheckoutPayload = {
      source_type: "lab_sample",
      source_id: SRC,
      link_kind: "final",
      payment_method: "cash",
      items: [{ description: "x", quantity: 1, unit_price: 10, is_taxable: true }],
    };
    await createSourceCheckoutInvoice(TENANT, IDEM, base);
    expect(rpcMock.mock.calls[0][1].p_payload).not.toHaveProperty("prices_include_tax");
    rpcMock.mockClear();
    await createSourceCheckoutInvoice(TENANT, IDEM, { ...base, prices_include_tax: true });
    expect(rpcMock.mock.calls[0][1].p_payload.prices_include_tax).toBe(true);
    rpcMock.mockClear();
    await createSourceCheckoutInvoice(TENANT, IDEM, { ...base, prices_include_tax: false });
    expect(rpcMock.mock.calls[0][1].p_payload.prices_include_tax).toBe(false);
  });

  it("horse_order branch strips items and forces final via typed contract", async () => {
    rpcMock.mockResolvedValue({ data: { ...OK_RESULT, source_type: "horse_order" }, error: null });
    const payload: HorseOrderCheckoutPayload = {
      source_type: "horse_order",
      source_id: SRC,
      link_kind: "final",
      payment_method: "debt",
    };
    await createSourceCheckoutInvoice(TENANT, IDEM, payload);
    const p = rpcMock.mock.calls[0][1].p_payload;
    expect(p.source_type).toBe("horse_order");
    expect(p.link_kind).toBe("final");
    expect(p).not.toHaveProperty("items");
  });

  it("rethrows Supabase RPC errors unchanged (never converts to success)", async () => {
    const err = new Error("FIN_IDEMPOTENCY_CONFLICT: request hash mismatch");
    rpcMock.mockResolvedValue({ data: null, error: err });
    await expect(
      createSourceCheckoutInvoice(TENANT, IDEM, {
        source_type: "lab_sample",
        source_id: SRC,
        link_kind: "final",
        payment_method: "cash",
        items: [{ description: "x", quantity: 1, unit_price: 10, is_taxable: true }],
      }),
    ).rejects.toBe(err);
  });

  it("rejects non-object / array responses via FIN_RPC_INVALID_RESPONSE", async () => {
    for (const bad of [null, [], "oops", 42]) {
      rpcMock.mockResolvedValue({ data: bad, error: null });
      await expect(
        createSourceCheckoutInvoice(TENANT, IDEM, {
          source_type: "horse_order",
          source_id: SRC,
          link_kind: "final",
          payment_method: "cash",
        }),
      ).rejects.toThrow(/FIN_RPC_INVALID_RESPONSE/);
    }
  });

  it("passes through the exact 17-key result contract", async () => {
    rpcMock.mockResolvedValue({ data: OK_RESULT, error: null });
    const result = await createSourceCheckoutInvoice(TENANT, IDEM, {
      source_type: "lab_sample",
      source_id: SRC,
      link_kind: "final",
      payment_method: "cash",
      items: [{ description: "x", quantity: 1, unit_price: 10, is_taxable: true }],
    });
    for (const k of RESULT_KEYS) expect(result).toHaveProperty(k);
    expect(Object.keys(result).length).toBe(RESULT_KEYS.size);
  });
});

describe("createSourceCheckoutInvoice compile-time contract (@ts-expect-error)", () => {
  it("rejects forbidden payload shapes at the type level", () => {
    // These assertions do not run — they are TypeScript compile-time gates.
    // Each @ts-expect-error MUST be meaningful; `tsc --noEmit` will fail if
    // the underlying error disappears.
    void (async () => {
      // Horse Order with items
      // @ts-expect-error horse_order MUST NOT carry items
      const p1: SourceCheckoutPayload = {
        source_type: "horse_order",
        source_id: SRC,
        link_kind: "final",
        payment_method: "cash",
        items: [],
      };
      // Horse Order with deposit
      // @ts-expect-error horse_order link_kind MUST be "final"
      const p2: SourceCheckoutPayload = {
        source_type: "horse_order",
        source_id: SRC,
        link_kind: "deposit",
        payment_method: "cash",
      };
      // Missing link_kind
      // @ts-expect-error link_kind is required
      const p3: SourceCheckoutPayload = {
        source_type: "lab_sample",
        source_id: SRC,
        payment_method: "cash",
        items: [],
      };
      // Root client_id forbidden
      // @ts-expect-error client_id is not a wrapper payload key
      const p4: SourceCheckoutPayload = {
        source_type: "lab_sample",
        source_id: SRC,
        link_kind: "final",
        payment_method: "cash",
        items: [],
        client_id: SRC,
      };
      // Unsupported source type
      // @ts-expect-error lab_request is not a supported source_type
      const p5: SourceCheckoutPayload = {
        source_type: "lab_request",
        source_id: SRC,
        link_kind: "final",
        payment_method: "cash",
      };
      void p1; void p2; void p3; void p4; void p5;
    });
  });
});
