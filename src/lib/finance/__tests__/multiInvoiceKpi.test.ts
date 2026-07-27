import { describe, expect, it } from "vitest";
import {
  buildKpiCells,
  formatPageIndicator,
  resolveInvoiceStatusKey,
} from "../multiInvoiceKpi";

describe("buildKpiCells", () => {
  it("returns exactly 4 cells in the fixed order", () => {
    const cells = buildKpiCells({
      eligibleCount: 17,
      totalOutstanding: 1234.5,
      selectedCount: 2,
      selectedOutstanding: 250,
    });
    expect(cells).toHaveLength(4);
    expect(cells.map((c) => c.id)).toEqual([
      "eligible",
      "totalOutstanding",
      "selected",
      "selectedOutstanding",
    ]);
  });
  it("carries raw numeric values through unchanged (no formatting here)", () => {
    const cells = buildKpiCells({
      eligibleCount: 17,
      totalOutstanding: 1234.5,
      selectedCount: 2,
      selectedOutstanding: 250,
    });
    expect(cells[0].value).toBe(17);
    expect(cells[1].value).toBe(1234.5);
    expect(cells[2].value).toBe(2);
    expect(cells[3].value).toBe(250);
  });
  it("uses the multiInvoicePayment.summary.* i18n keys", () => {
    const cells = buildKpiCells({
      eligibleCount: 0,
      totalOutstanding: 0,
      selectedCount: 0,
      selectedOutstanding: 0,
    });
    expect(cells.map((c) => c.labelKey)).toEqual([
      "finance.multiInvoicePayment.summary.eligibleCount",
      "finance.multiInvoicePayment.summary.totalOutstanding",
      "finance.multiInvoicePayment.summary.selectedCount",
      "finance.multiInvoicePayment.summary.selectedOutstanding",
    ]);
  });
});

describe("formatPageIndicator", () => {
  it("interpolates English 'X of Y' template", () => {
    expect(formatPageIndicator("{{current}} of {{total}}", 2, 17)).toBe("2 of 17");
  });
  it("interpolates Arabic 'X من Y' template", () => {
    expect(formatPageIndicator("{{current}} من {{total}}", 2, 17)).toBe("2 من 17");
  });
  it("handles zero counts without dropping the separator", () => {
    expect(formatPageIndicator("{{current}} of {{total}}", 0, 0)).toBe("0 of 0");
  });
});

describe("resolveInvoiceStatusKey unknown fallback", () => {
  it("maps known statuses to their i18n key", () => {
    expect(resolveInvoiceStatusKey("draft")).toEqual({ key: "draft", known: true });
    expect(resolveInvoiceStatusKey("paid")).toEqual({ key: "paid", known: true });
  });
  it("maps the legacy 'sent' status to approved (unchanged behavior)", () => {
    expect(resolveInvoiceStatusKey("sent")).toEqual({ key: "approved", known: true });
  });
  it("falls back to 'unknown' — NOT 'draft' — for unmapped statuses", () => {
    expect(resolveInvoiceStatusKey("frobnicated")).toEqual({ key: "unknown", known: false });
  });
  it("treats null / empty string as unknown", () => {
    expect(resolveInvoiceStatusKey(null)).toEqual({ key: "unknown", known: false });
    expect(resolveInvoiceStatusKey("")).toEqual({ key: "unknown", known: false });
    expect(resolveInvoiceStatusKey(undefined)).toEqual({ key: "unknown", known: false });
  });
});
