import { describe, expect, it } from "vitest";
import {
  distributeBucketsAcrossTenders,
  validateBucketAllocations,
  CLIENT_LEVEL_BUCKET_KEY,
} from "../allocationDistribution";

describe("distributeBucketsAcrossTenders", () => {
  it("splits a single-horse bucket 1:1 for a single tender", () => {
    const result = distributeBucketsAcrossTenders({
      tenders: [{ payment_method: "cash", amount: 100 }],
      buckets: [{ key: "h1", kind: "horse", horseId: "h1", amount: 100 }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100);
    expect(result[0].horse_allocations).toEqual([{ horse_id: "h1", amount: 100 }]);
    expect(result[0].client_level_amount).toBeUndefined();
  });

  it("distributes two buckets across split-tender preserving row totals", () => {
    const rows = distributeBucketsAcrossTenders({
      tenders: [
        { payment_method: "cash", amount: 60 },
        { payment_method: "card", amount: 40 },
      ],
      buckets: [
        { key: "h1", kind: "horse", horseId: "h1", amount: 70 },
        { key: "h2", kind: "horse", horseId: "h2", amount: 30 },
      ],
    });
    // Row totals preserved.
    expect(rows[0].amount).toBe(60);
    expect(rows[1].amount).toBe(40);
    // Per-horse totals across rows preserved.
    const perHorse: Record<string, number> = {};
    for (const r of rows) for (const h of r.horse_allocations ?? []) {
      perHorse[h.horse_id] = (perHorse[h.horse_id] ?? 0) + h.amount;
    }
    expect(perHorse.h1).toBeCloseTo(70, 2);
    expect(perHorse.h2).toBeCloseTo(30, 2);
    // Sum of per-row horse allocations equals row amount.
    for (const r of rows) {
      const rowSum = (r.horse_allocations ?? []).reduce((s, h) => s + h.amount, 0)
        + (r.client_level_amount ?? 0);
      expect(rowSum).toBeCloseTo(r.amount, 2);
    }
  });

  it("mixes horse and client-level buckets", () => {
    const rows = distributeBucketsAcrossTenders({
      tenders: [{ payment_method: "cash", amount: 50 }],
      buckets: [
        { key: "h1", kind: "horse", horseId: "h1", amount: 30 },
        { key: CLIENT_LEVEL_BUCKET_KEY, kind: "client", amount: 20 },
      ],
    });
    expect(rows[0].horse_allocations).toEqual([{ horse_id: "h1", amount: 30 }]);
    expect(rows[0].client_level_amount).toBe(20);
  });

  it("rounds residual cents deterministically (largest fraction wins)", () => {
    const rows = distributeBucketsAcrossTenders({
      tenders: [
        { payment_method: "cash", amount: 33.33 },
        { payment_method: "card", amount: 33.34 },
        { payment_method: "transfer", amount: 33.33 },
      ],
      buckets: [
        { key: "h1", kind: "horse", horseId: "h1", amount: 100 },
      ],
    });
    const total = rows.reduce((s, r) => s + (r.horse_allocations?.[0]?.amount ?? 0), 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });

  it("rejects mismatched bucket totals", () => {
    expect(() =>
      distributeBucketsAcrossTenders({
        tenders: [{ payment_method: "cash", amount: 100 }],
        buckets: [{ key: "h1", kind: "horse", horseId: "h1", amount: 60 }],
      }),
    ).toThrow(/FIN_HORSE_ALLOCATION_MISMATCH/);
  });
});

describe("validateBucketAllocations", () => {
  it("accepts a balanced allocation within remaining caps", () => {
    const r = validateBucketAllocations({
      paymentAmount: 100,
      buckets: [
        { key: "h1", kind: "horse", horseId: "h1", amount: 70 },
        { key: "h2", kind: "horse", horseId: "h2", amount: 30 },
      ],
      remainingByBucketKey: { h1: 80, h2: 40 },
    });
    expect(r.ok).toBe(true);
  });

  it("rejects allocation exceeding a bucket remaining", () => {
    const r = validateBucketAllocations({
      paymentAmount: 100,
      buckets: [{ key: "h1", kind: "horse", horseId: "h1", amount: 100 }],
      remainingByBucketKey: { h1: 50 },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects total ≠ payment amount", () => {
    const r = validateBucketAllocations({
      paymentAmount: 100,
      buckets: [{ key: "h1", kind: "horse", horseId: "h1", amount: 60 }],
      remainingByBucketKey: { h1: 100 },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects negative amounts", () => {
    const r = validateBucketAllocations({
      paymentAmount: 100,
      buckets: [
        { key: "h1", kind: "horse", horseId: "h1", amount: -1 },
        { key: "h2", kind: "horse", horseId: "h2", amount: 101 },
      ],
      remainingByBucketKey: { h1: 100, h2: 200 },
    });
    expect(r.ok).toBe(false);
  });
});
