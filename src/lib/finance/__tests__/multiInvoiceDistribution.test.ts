import { describe, expect, it } from "vitest";
import {
  applyComplement,
  buildAllocationsPayload,
  centsEqual,
  countGeneratedRows,
  largestRemainderSplit,
  proposeOldestFirst,
  toCents,
} from "../multiInvoiceDistribution";

describe("largestRemainderSplit", () => {
  it("returns zeros when total is zero", () => {
    expect(largestRemainderSplit(0, [1, 2, 3])).toEqual([0, 0, 0]);
  });
  it("preserves the total exactly in cents", () => {
    const out = largestRemainderSplit(1000, [3, 3, 3]);
    expect(out.reduce((s, v) => s + v, 0)).toBe(1000);
  });
  it("is deterministic and breaks ties by lower index", () => {
    const a = largestRemainderSplit(100, [1, 1, 1]);
    const b = largestRemainderSplit(100, [1, 1, 1]);
    expect(a).toEqual(b);
    // 100/3 = 33 rem 1 → first bucket receives the extra cent
    expect(a).toEqual([34, 33, 33]);
  });
});

describe("proposeOldestFirst", () => {
  it("fills invoices in the supplied order and stops when funds run out", () => {
    const proposal = proposeOldestFirst(
      [
        { invoiceId: "a", outstanding: 100, dueDate: "2026-01-01", issueDate: "2026-01-01", invoiceNumber: "A" },
        { invoiceId: "b", outstanding: 50, dueDate: "2026-02-01", issueDate: "2026-02-01", invoiceNumber: "B" },
        { invoiceId: "c", outstanding: 80, dueDate: "2026-03-01", issueDate: "2026-03-01", invoiceNumber: "C" },
      ],
      120,
    );
    expect(proposal).toEqual({ a: 100, b: 20, c: 0 });
  });
  it("always includes every invoice in the output map", () => {
    const proposal = proposeOldestFirst(
      [
        { invoiceId: "a", outstanding: 100, dueDate: null, issueDate: "2026-01-01", invoiceNumber: "A" },
        { invoiceId: "b", outstanding: 50, dueDate: null, issueDate: "2026-02-01", invoiceNumber: "B" },
      ],
      50,
    );
    expect(Object.keys(proposal).sort()).toEqual(["a", "b"]);
    expect(proposal.b).toBe(0);
  });
});

describe("applyComplement", () => {
  const outstanding = { a: 100, b: 100 };
  it("fills the single untouched invoice with the exact remainder", () => {
    const out = applyComplement({
      values: { a: 40, b: 0 },
      touched: new Set(["a"]),
      totalPaymentUnits: 100,
      outstandingByInvoice: outstanding,
    });
    expect(out).toEqual({ a: 40, b: 60 });
  });
  it("does nothing when remainder would exceed the untouched cap", () => {
    const out = applyComplement({
      values: { a: 0, b: 0 },
      touched: new Set(["a"]),
      totalPaymentUnits: 500,
      outstandingByInvoice: { a: 100, b: 100 },
    });
    expect(out).toEqual({ a: 0, b: 0 });
  });
  it("does nothing when zero or many invoices are untouched", () => {
    const zero = applyComplement({
      values: { a: 40, b: 60 },
      touched: new Set(["a", "b"]),
      totalPaymentUnits: 100,
      outstandingByInvoice: outstanding,
    });
    expect(zero).toEqual({ a: 40, b: 60 });
  });
});

describe("buildAllocationsPayload", () => {
  it("generates one row per non-zero (invoice, tender) pair and preserves cents", () => {
    const rows = buildAllocationsPayload({
      invoiceOrder: ["inv-1", "inv-2"],
      invoiceAmountsUnits: { "inv-1": 100, "inv-2": 50 },
      tenderRows: [
        { id: "t1", method: "cash", amount: 90 },
        { id: "t2", method: "transfer", amount: 60, reference: "TXN-1" },
      ],
    });
    // 2 invoices × 2 tenders = 4 rows
    expect(rows).toHaveLength(4);
    // Column totals match invoice amounts exactly.
    const totalForInv = (id: string) =>
      rows.filter((r) => r.invoice_id === id).reduce((s, r) => s + toCents(r.amount), 0);
    expect(totalForInv("inv-1")).toBe(10000);
    expect(totalForInv("inv-2")).toBe(5000);
    // Row totals match tender amounts exactly.
    const totalForTender = (m: string) =>
      rows.filter((r) => r.payment_method === m).reduce((s, r) => s + toCents(r.amount), 0);
    expect(totalForTender("cash")).toBe(9000);
    expect(totalForTender("transfer")).toBe(6000);
    // External reference is carried through only for the tender that has one.
    expect(rows.filter((r) => r.external_reference === "TXN-1")).toHaveLength(2);
  });

  it("skips zero-amount invoices and zero-amount tenders", () => {
    const rows = buildAllocationsPayload({
      invoiceOrder: ["inv-1", "inv-2", "inv-3"],
      invoiceAmountsUnits: { "inv-1": 25, "inv-2": 0, "inv-3": 75 },
      tenderRows: [
        { id: "t1", method: "cash", amount: 100 },
        { id: "t2", method: "card", amount: 0 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.payment_method === "cash")).toBe(true);
    expect(new Set(rows.map((r) => r.invoice_id))).toEqual(new Set(["inv-1", "inv-3"]));
  });

  it("propagates bucket breakdown so client + horse amounts sum to each cell", () => {
    const rows = buildAllocationsPayload({
      invoiceOrder: ["inv-1"],
      invoiceAmountsUnits: { "inv-1": 100 },
      tenderRows: [
        { id: "t1", method: "cash", amount: 60 },
        { id: "t2", method: "card", amount: 40 },
      ],
      bucketBreakdownByInvoice: {
        "inv-1": {
          invoiceId: "inv-1",
          clientLevelAmount: 30,
          horseAllocations: [{ horseId: "h1", amount: 70 }],
        },
      },
    });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      const horseSum =
        r.horse_allocations?.reduce((s, h) => s + toCents(h.amount), 0) ?? 0;
      const cl = toCents(r.client_level_amount ?? 0);
      expect(centsEqual((horseSum + cl) / 100, r.amount)).toBe(true);
    }
    // Aggregated horse allocation across cells equals the full 70.
    const horseTotal = rows.reduce(
      (s, r) => s + (r.horse_allocations?.reduce((a, h) => a + toCents(h.amount), 0) ?? 0),
      0,
    );
    expect(horseTotal).toBe(7000);
  });
});

describe("countGeneratedRows", () => {
  it("returns invoices × tenders when both are non-zero", () => {
    expect(
      countGeneratedRows({
        invoiceAmountsUnits: { a: 10, b: 20, c: 30 },
        tenderRows: [
          { id: "t1", method: "cash", amount: 30 },
          { id: "t2", method: "card", amount: 30 },
        ],
      }),
    ).toBe(6);
  });
  it("returns 0 when either side is fully zero", () => {
    expect(
      countGeneratedRows({
        invoiceAmountsUnits: { a: 0 },
        tenderRows: [{ id: "t1", method: "cash", amount: 10 }],
      }),
    ).toBe(0);
  });
});
