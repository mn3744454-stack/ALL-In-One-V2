/**
 * Stage C · Slice B — Prompt 43 targeted correction.
 *
 * Ledger and Payments Print/CSV must serialize `effective_date` as a date-only
 * economic date: no fabricated time, no UTC calendar-day shift. Timestamp-based
 * callers keep the legacy 12-hour behavior via the default date mode.
 *
 * These tests assert the ACTUAL serialized print HTML and CSV content, not
 * helper existence. Read-only: no database or write path is referenced.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildLedgerPrintHtml,
  buildLedgerCSVContent,
  type LedgerExportEntry,
} from "@/components/clients/StatementPrintUtils";

const TIME_PATTERN = /\d{1,2}:\d{2}|AM|PM|صباح|مساء/;

const ledgerEntries: LedgerExportEntry[] = [
  { id: "a", date: "2026-07-25", entry_type: "invoice", description: "INV-1001", debit: 1500, credit: 0, balance: 1500 },
  { id: "b", date: "2026-01-01", entry_type: "payment", description: "Bank transfer", debit: 0, credit: 500.5, balance: 999.5 },
];

const paymentEntries: LedgerExportEntry[] = [
  { id: "p1", date: "2026-07-25", entry_type: "cash", description: "Cash payment", debit: 0, credit: 220.25, balance: 780 },
  { id: "p2", date: "2025-12-31", entry_type: "bank", description: "Bank payment", debit: 0, credit: 100, balance: 1000 },
];

const printLedger = (extra: Partial<Parameters<typeof buildLedgerPrintHtml>[0]> = {}) =>
  buildLedgerPrintHtml({
    title: "General Ledger",
    entries: ledgerEntries,
    totalDebits: 1500,
    totalCredits: 500.5,
    dateMode: "economic-date",
    ...extra,
  });

const csvLedger = (extra: Partial<Parameters<typeof buildLedgerCSVContent>[0]> = {}) =>
  buildLedgerCSVContent({ entries: ledgerEntries, dateMode: "economic-date", ...extra });

describe("Prompt 43 · Ledger Print economic-date parity", () => {
  it("1. renders date-only with no fabricated time", () => {
    const html = printLedger();
    expect(html).toContain(">25-07-2026<");
    expect(html).toContain(">01-01-2026<");
    const dateCells = html.match(/font-family:monospace;white-space:nowrap" dir="ltr">([^<]*)</g) || [];
    expect(dateCells.length).toBe(2);
    for (const cell of dateCells) expect(cell).not.toMatch(TIME_PATTERN);
  });

  it("5. does not shift 2026-07-25 to another calendar day", () => {
    expect(printLedger()).not.toContain("24-07-2026");
    expect(printLedger()).not.toContain("26-07-2026");
  });

  it("6. Arabic and English print the same underlying economic date", () => {
    const en = printLedger({ isRTL: false, lang: "en" });
    const ar = printLedger({ isRTL: true, lang: "ar" });
    expect(en).toContain(">25-07-2026<");
    expect(ar).toContain(">25-07-2026<");
    expect(ar).not.toMatch(/صباح|مساء/);
  });

  it("10. totals, amounts, type and description are unchanged", () => {
    const html = printLedger();
    expect(html).toContain("INV-1001");
    expect(html).toContain("Bank transfer");
    // Intl emits a non-breaking space after the currency code.
    expect(html).toMatch(/SAR\s1,500\.00/);
    expect(html).toMatch(/SAR\s500\.50/);
    expect(html).toMatch(/SAR\s999\.50/);
  });

  it("9. row order is preserved exactly as supplied by the caller", () => {
    const html = printLedger();
    expect(html.indexOf("25-07-2026")).toBeLessThan(html.indexOf("01-01-2026"));
  });
});

describe("Prompt 43 · Ledger CSV economic-date parity", () => {
  it("2. renders date-only with no fabricated time", () => {
    const csv = csvLedger();
    const rows = csv.split("\n");
    expect(rows[1].startsWith("25-07-2026,")).toBe(true);
    expect(rows[2].startsWith("01-01-2026,")).toBe(true);
    for (const r of rows.slice(1)) expect(r.split(",")[0]).not.toMatch(TIME_PATTERN);
  });

  it("preserves headers, column order, escaping and amount formatting", () => {
    const csv = csvLedger();
    const [header, first] = csv.split("\n");
    expect(header.split(",").length).toBe(6);
    expect(first).toBe('25-07-2026,invoice,"INV-1001",1500.00,,1500.00');
    const ar = csvLedger({ isRTL: true });
    expect(ar.split("\n")[0]).toContain("النوع");
  });
});

describe("Prompt 43 · Payments Print and CSV economic-date parity", () => {
  it("3. Payments print renders date-only with no fabricated time", () => {
    const html = buildLedgerPrintHtml({
      title: "Payments Register",
      entries: paymentEntries,
      totalDebits: 0,
      totalCredits: 320.25,
      dateMode: "economic-date",
    });
    expect(html).toContain(">25-07-2026<");
    expect(html).toContain(">31-12-2025<");
    const dateCells = html.match(/font-family:monospace;white-space:nowrap" dir="ltr">([^<]*)</g) || [];
    for (const cell of dateCells) expect(cell).not.toMatch(TIME_PATTERN);
  });

  it("4. Payments CSV renders date-only with no fabricated time", () => {
    const csv = buildLedgerCSVContent({ entries: paymentEntries, dateMode: "economic-date" });
    const rows = csv.split("\n").slice(1);
    expect(rows[0].startsWith("25-07-2026,")).toBe(true);
    expect(rows[1].startsWith("31-12-2025,")).toBe(true);
    for (const r of rows) expect(r.split(",")[0]).not.toMatch(TIME_PATTERN);
  });
});

describe("Prompt 43 · Timestamp mode and caller isolation", () => {
  it("7. default (timestamp) mode still renders a real timestamp with time", () => {
    const html = buildLedgerPrintHtml({
      title: "Audit",
      entries: [{ id: "t", date: "2026-07-25T13:45:00.000Z", entry_type: "audit", description: "x", debit: 0, credit: 0, balance: 0 }],
      totalDebits: 0,
      totalCredits: 0,
    });
    expect(html).toMatch(TIME_PATTERN);
    const csv = buildLedgerCSVContent({
      entries: [{ date: "2026-07-25T13:45:00.000Z", entry_type: "audit", description: "x", debit: 0, credit: 0, balance: 0 }],
    });
    expect(csv.split("\n")[1]).toMatch(TIME_PATTERN);
  });

  it("11. the only callers of these utilities are the Ledger and Payments tabs, all in economic-date mode", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/DashboardFinance.tsx"), "utf8");
    expect((page.match(/printLedgerEntries\(\{/g) || []).length).toBe(2);
    expect((page.match(/exportLedgerCSV\(\{/g) || []).length).toBe(2);
    expect((page.match(/dateMode: "economic-date"/g) || []).length).toBe(4);
  });

  it("8/12. Slice-A statement exports keep their own date-only formatter and no write path is referenced", () => {
    const utils = readFileSync(resolve(process.cwd(), "src/components/clients/StatementPrintUtils.ts"), "utf8");
    expect(utils).toContain("function formatDateForPrint");
    expect(utils).toContain("return formatEconomicDate(dateStr);");
    expect(utils).not.toMatch(/supabase|\.insert\(|\.update\(|\.delete\(/);
  });
});
