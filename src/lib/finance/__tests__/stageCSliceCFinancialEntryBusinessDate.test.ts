/**
 * Stage C · Slice C — direct tests for read-time business-date inheritance on
 * `financial_entries` (Internal Costs).
 */
import { describe, it, expect } from "vitest";
import {
  FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS,
  attachBusinessDates,
  buildSourceDateLookup,
  compareFinancialEntryOrder,
  groupSourceIdsByType,
  isSupportedSourceType,
  normalizeSourceDate,
  pickSourceBusinessDate,
  sortFinancialEntries,
  sourceSelectColumns,
} from "@/lib/finance/financialEntryBusinessDate";
import { formatEconomicDate } from "@/lib/finance/effectiveDate";

const entry = (
  id: string,
  entity_type: string,
  entity_id: string,
  created_at: string
) => ({ id, entity_type, entity_id, created_at, actual_cost: 100, currency: "SAR" });

describe("source-date contracts", () => {
  it("1. each proven entity type resolves its source business date", () => {
    expect(
      pickSourceBusinessDate("vet_treatment", {
        id: "t1",
        completed_at: "2026-03-10T08:00:00Z",
        scheduled_for: "2026-03-01T08:00:00Z",
      }).businessDate
    ).toBe("2026-03-10");
    expect(
      pickSourceBusinessDate("vaccination", { id: "v1", administered_date: "2026-02-04" })
    ).toEqual({ businessDate: "2026-02-04", businessDateSource: "horse_vaccinations.administered_date" });
    expect(
      pickSourceBusinessDate("breeding_attempt", { id: "b1", attempt_date: "2026-01-20T09:30:00Z" })
        .businessDate
    ).toBe("2026-01-20");
    expect(
      pickSourceBusinessDate("foaling", { id: "f1", foaling_date: "2026-05-30" })
    ).toEqual({ businessDate: "2026-05-30", businessDateSource: "foalings.foaling_date" });
  });

  it("1b. falls back to scheduled_for only within the treatment contract", () => {
    const resolved = pickSourceBusinessDate("vet_treatment", {
      id: "t2",
      completed_at: null,
      scheduled_for: "2026-04-02T06:00:00Z",
    });
    expect(resolved).toEqual({
      businessDate: "2026-04-02",
      businessDateSource: "vet_treatments.scheduled_for",
    });
  });

  it("2. at least one source business date differs from created_at", () => {
    const rows = [entry("e1", "vaccination", "v1", "2026-06-30T21:00:00Z")];
    const lookup = buildSourceDateLookup([
      { entityType: "vaccination", rows: [{ id: "v1", administered_date: "2026-02-04" }] },
    ]);
    const [enriched] = attachBusinessDates(rows, lookup);
    expect(enriched.business_date).toBe("2026-02-04");
    expect(enriched.business_date).not.toBe(enriched.created_at.slice(0, 10));
  });

  it("3/4. read model exposes business_date while created_at stays separate", () => {
    const rows = [entry("e1", "foaling", "f1", "2026-07-01T10:00:00Z")];
    const [enriched] = attachBusinessDates(
      rows,
      buildSourceDateLookup([
        { entityType: "foaling", rows: [{ id: "f1", foaling_date: "2026-05-30" }] },
      ])
    );
    expect(enriched.business_date).toBe("2026-05-30");
    expect(enriched.created_at).toBe("2026-07-01T10:00:00Z");
    expect(enriched.business_date_source).toBe("foalings.foaling_date");
  });

  it("5/6. unresolved sources return null and never fall back to created_at", () => {
    const rows = [
      entry("e1", "vaccination", "v-missing", "2026-06-30T21:00:00Z"), // no source row
      entry("e2", "vaccination", "v-null", "2026-06-29T21:00:00Z"), // source row, null date
      entry("e3", "expense_other", "x1", "2026-06-28T21:00:00Z"), // unsupported type
    ];
    const enriched = attachBusinessDates(
      rows,
      buildSourceDateLookup([
        { entityType: "vaccination", rows: [{ id: "v-null", administered_date: null }] },
      ])
    );
    for (const e of enriched) {
      expect(e.business_date).toBeNull();
      expect(e.business_date_source).toBeNull();
      expect(e.business_date).not.toBe(e.created_at);
      expect(e.business_date).not.toBe(e.created_at.slice(0, 10));
    }
  });

  it("6b. no contract references created_at or updated_at", () => {
    for (const contract of Object.values(FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS)) {
      expect(contract.dateColumns).not.toContain("created_at");
      expect(contract.dateColumns).not.toContain("updated_at");
      expect(sourceSelectColumns(Object.keys(FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS)[0])).toContain("id");
    }
    expect(isSupportedSourceType("expense_other")).toBe(false);
    expect(sourceSelectColumns("expense_other")).toBeNull();
  });

  it("8. resolved dates render through formatEconomicDate with no time", () => {
    const rendered = formatEconomicDate("2026-02-04");
    expect(rendered).toBe("04-02-2026");
    expect(rendered).not.toMatch(/AM|PM|00:00|صباح|مساء/);
  });

  it("11. batch resolution groups unique ids, one query per type", () => {
    const rows = [
      entry("e1", "vet_treatment", "t1", "2026-01-01T00:00:00Z"),
      entry("e2", "vet_treatment", "t1", "2026-01-02T00:00:00Z"),
      entry("e3", "vet_treatment", "t2", "2026-01-03T00:00:00Z"),
      entry("e4", "vaccination", "v1", "2026-01-04T00:00:00Z"),
      entry("e5", "unsupported_type", "u1", "2026-01-05T00:00:00Z"),
    ];
    const grouped = groupSourceIdsByType(rows);
    expect(Object.keys(grouped).sort()).toEqual(["vaccination", "vet_treatment"]);
    expect(grouped.vet_treatment.sort()).toEqual(["t1", "t2"]);
    expect(grouped.vaccination).toEqual(["v1"]);
    // one batch per type, strictly fewer than one per row
    expect(Object.keys(grouped).length).toBeLessThan(rows.length);
  });

  it("12. enrichment preserves every existing field", () => {
    const rows = [entry("e1", "vaccination", "v1", "2026-06-30T21:00:00Z")];
    const [enriched] = attachBusinessDates(rows, {});
    expect(enriched.actual_cost).toBe(100);
    expect(enriched.currency).toBe("SAR");
    expect(enriched.entity_type).toBe("vaccination");
    expect(enriched.entity_id).toBe("v1");
  });

  it("normalizes date and timestamptz kinds without inventing values", () => {
    expect(normalizeSourceDate(null, "date")).toBeNull();
    expect(normalizeSourceDate("", "timestamptz")).toBeNull();
    expect(normalizeSourceDate("not-a-date", "timestamptz")).toBeNull();
    expect(normalizeSourceDate("2026-05-30", "date")).toBe("2026-05-30");
  });
});

describe("deterministic ordering", () => {
  const row = (id: string, business_date: string | null, created_at: string) => ({
    id,
    business_date,
    created_at,
  });

  it("9. business date DESC with NULLs last", () => {
    const sorted = sortFinancialEntries([
      row("a", null, "2026-09-09T00:00:00Z"),
      row("b", "2026-01-01", "2026-01-01T00:00:00Z"),
      row("c", "2026-05-05", "2026-01-01T00:00:00Z"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("10. same-date ties use created_at DESC then id DESC", () => {
    const sorted = sortFinancialEntries([
      row("aa", "2026-03-03", "2026-03-03T09:00:00Z"),
      row("zz", "2026-03-03", "2026-03-03T10:00:00Z"),
      row("mm", "2026-03-03", "2026-03-03T09:00:00Z"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["zz", "mm", "aa"]);
  });

  it("9b. multiple unresolved rows still order by created_at then id", () => {
    const sorted = sortFinancialEntries([
      row("a1", null, "2026-01-01T00:00:00Z"),
      row("a2", null, "2026-02-01T00:00:00Z"),
      row("b0", "2020-01-01", "2019-01-01T00:00:00Z"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["b0", "a2", "a1"]);
    expect(compareFinancialEntryOrder(sorted[0], sorted[1])).toBeLessThan(0);
  });

  it("sorting is immutable", () => {
    const input = [row("a", "2026-01-01", "2026-01-01T00:00:00Z"), row("b", "2026-02-01", "2026-01-01T00:00:00Z")];
    const copy = [...input];
    sortFinancialEntries(input);
    expect(input).toEqual(copy);
  });
});

describe("21. resolver purity", () => {
  it("references no writer or database client", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/finance/financialEntryBusinessDate.ts", "utf8")
    );
    expect(src).not.toMatch(/integrations\/supabase\/client/);
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  });
});
