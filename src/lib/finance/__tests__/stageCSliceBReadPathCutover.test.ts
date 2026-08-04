/**
 * Stage C · Slice B — Confirmed financial read-path cutover.
 *
 * Covers the three confirmed business-date contracts:
 *   • Customer-level (unallocated) activity → ledger_entries.effective_date
 *   • Ledger / Payments lists              → ledger_entries.effective_date
 *   • Invoice lists                        → invoices.issue_date
 *
 * Read-only: these tests never touch the database and never exercise a write
 * path. Source-level assertions pin the query contracts; behavioral assertions
 * pin ordering and rendering.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  compareEconomicOrder,
  formatEconomicDate,
  toEconomicDateString,
} from "@/lib/finance/effectiveDate";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const unallocated = read("src/hooks/clients/useUnallocatedPayments.ts");
const ledger = read("src/hooks/finance/useLedger.ts");
const invoices = read("src/hooks/finance/useInvoices.ts");
const financePage = read("src/pages/DashboardFinance.tsx");
const invoicesList = read("src/components/finance/InvoicesList.tsx");
const statementTab = read("src/components/clients/ClientStatementTab.tsx");
const statementHook = read("src/hooks/clients/useClientStatement.ts");
const invoiceCard = read("src/components/finance/InvoiceCard.tsx");
const overdueFn = read("supabase/functions/mark-overdue-invoices/index.ts");

describe("Slice B · Unallocated / customer-level activity", () => {
  it("1. selects the business date alongside audit created_at", () => {
    expect(unallocated).toContain("id, effective_date, created_at, entry_type");
  });

  it("2. displays effective_date, not created_at", () => {
    expect(unallocated).toContain("date: toEconomicDateString(r.effective_date)");
    expect(unallocated).not.toContain("date: r.created_at");
    expect(statementTab).toContain("{formatEconomicDate(e.date)}");
    expect(statementTab).not.toContain("{formatDateTime12h(e.date)}");
  });

  it("3. filters on effective_date with date-only inclusive bounds", () => {
    expect(unallocated).toContain('q.gte("effective_date", toEconomicDateString(dateFrom))');
    expect(unallocated).toContain('q.lte("effective_date", toEconomicDateString(dateTo))');
    expect(unallocated).not.toContain("localDateFromToUtcIso");
    expect(unallocated).not.toContain("localDateToToUtcIso");
  });

  it("4. orders deterministically on all three keys", () => {
    const idx = (k: string) => unallocated.indexOf(`.order("${k}"`);
    expect(idx("effective_date")).toBeGreaterThan(-1);
    expect(idx("created_at")).toBeGreaterThan(idx("effective_date"));
    expect(idx("id")).toBeGreaterThan(idx("created_at"));
  });

  it("5. renders no fabricated time for a date-only value", () => {
    expect(formatEconomicDate("2026-03-04")).toBe("04-03-2026");
    expect(formatEconomicDate("2026-03-04")).not.toMatch(/AM|PM|:/);
  });

  it("6. preserves tenant and client scope", () => {
    expect(unallocated).toContain('.eq("tenant_id", tenantId)');
    expect(unallocated).toContain('.eq("client_id", clientId)');
  });

  it("7. preserves classification and cancellation-exclusion logic", () => {
    expect(unallocated).toContain('.neq("reference_type", "invoice_cancellation")');
    expect(unallocated).toContain("unresolved_legacy");
    expect(unallocated).toContain("customer_level");
  });
});

describe("Slice B · Ledger and Payments lists", () => {
  it("8. selects and displays effective_date", () => {
    expect(ledger).toContain("effective_date, created_at");
    expect(financePage).toContain("{formatEconomicDate(entry.effective_date)}");
    expect(financePage).not.toContain("formatDateTime12h(entry.created_at, lang)");
  });

  it("9. filters on effective_date (no UTC window)", () => {
    expect(financePage).toContain("toEconomicDateString(e.effective_date)");
    expect(financePage).not.toContain('dateTo + "T23:59:59"');
  });

  it("10. query orders by effective_date, created_at, id descending", () => {
    const idx = (k: string) => ledger.indexOf(`.order("${k}"`);
    expect(idx("effective_date")).toBeGreaterThan(-1);
    expect(idx("created_at")).toBeGreaterThan(idx("effective_date"));
    expect(idx("id")).toBeGreaterThan(idx("created_at"));
    expect(ledger).not.toContain('.order("created_at", { ascending: false });');
  });

  it("11. same-effective-date ties resolve by created_at then id", () => {
    const rows = [
      { date: "2026-01-10", createdAt: "2026-01-11T08:00:00Z", id: "b" },
      { date: "2026-01-10", createdAt: "2026-01-11T08:00:00Z", id: "a" },
      { date: "2026-01-10", createdAt: "2026-01-12T08:00:00Z", id: "c" },
      { date: "2026-02-01", createdAt: "2026-01-01T08:00:00Z", id: "d" },
    ];
    const sorted = [...rows].sort((x, y) => compareEconomicOrder(x, y, "desc"));
    expect(sorted.map((r) => r.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("12. renders date only for ledger rows", () => {
    expect(formatEconomicDate("2025-12-31")).toBe("31-12-2025");
    expect(toEconomicDateString("2025-12-31T23:30:00Z")).toBe("2025-12-31");
  });

  it("13. in-memory list order matches the query order (stable pagination)", () => {
    const occurrences = financePage.match(/compareEconomicOrder\(/g) || [];
    expect(occurrences.length).toBe(2); // Ledger tab + Payments tab
    expect(financePage).toContain('"desc"');
  });

  it("14. amount, sign, type and stored balance_after are untouched", () => {
    expect(ledger).toContain("balance_after");
    expect(ledger).toContain("Stage B: browser-side ledger mutation removed");
    expect(ledger).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});

describe("Slice B · Invoice lists", () => {
  it("15. orders by issue_date first", () => {
    const idx = (k: string) => invoices.indexOf(`.order("${k}"`);
    expect(idx("issue_date")).toBeGreaterThan(-1);
    expect(idx("issue_date")).toBeLessThan(idx("created_at"));
  });

  it("16. created_at and id are tie-breakers only", () => {
    const idx = (k: string) => invoices.indexOf(`.order("${k}"`);
    expect(idx("created_at")).toBeGreaterThan(idx("issue_date"));
    expect(idx("id")).toBeGreaterThan(idx("created_at"));
  });

  it("17. due-date and overdue behavior still use due_date", () => {
    expect(invoices).toContain("due_date?: string");
    expect(invoices).not.toContain('.order("due_date"');
    // Overdue marking remains a due_date rule, untouched by the list cutover.
    expect(overdueFn).toContain('.not("due_date", "is", null)');
    expect(overdueFn).toContain('.lt("due_date"');
    // Card surface still renders the dedicated due date.
    expect(invoiceCard).toContain("invoice.due_date");
  });

  it("18. invoice document date renders via the economic formatter", () => {
    expect(invoicesList).toContain("{formatEconomicDate(invoice.issue_date)}");
    expect(invoicesList).not.toContain('format(new Date(invoice.issue_date), "dd-MM-yyyy")');
  });

  it("19. status and tenant filters remain unchanged", () => {
    expect(invoices).toContain('.eq("tenant_id", tenantId)');
    expect(invoicesList).toContain("status");
  });

  it("20. same-issue-date ties are deterministic", () => {
    const rows = [
      { date: "2026-05-01", createdAt: "2026-05-01T10:00:00Z", id: "i2" },
      { date: "2026-05-01", createdAt: "2026-05-01T10:00:00Z", id: "i1" },
      { date: "2026-05-02", createdAt: "2026-04-01T10:00:00Z", id: "i3" },
    ];
    const sorted = [...rows].sort((x, y) => compareEconomicOrder(x, y, "desc"));
    expect(sorted.map((r) => r.id)).toEqual(["i3", "i2", "i1"]);
  });
});

describe("Slice B · Shared regression boundary", () => {
  it("21. Slice-A statement hook is untouched by Slice B", () => {
    expect(statementHook).toContain("effective_date");
    expect(statementHook).toContain("openingBalance");
  });

  it("22. no write path was introduced in the changed read hooks", () => {
    for (const src of [unallocated, ledger, invoices]) {
      expect(src).not.toContain("post_payment_session");
      expect(src).not.toContain("post_expense_with_ledger");
    }
    // Both cut-over ledger read hooks remain strictly read-only.
    expect(unallocated).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(ledger).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });

  it("23. Arabic and English render the same underlying business date", () => {
    // formatEconomicDate is language-agnostic and digit-stable.
    expect(formatEconomicDate("2026-07-09")).toBe("09-07-2026");
    expect(formatEconomicDate(new Date(2026, 6, 9))).toBe("09-07-2026");
  });

  it("24. no UTC day shift for date-only columns", () => {
    expect(toEconomicDateString("2026-01-01")).toBe("2026-01-01");
    expect(formatEconomicDate("2026-01-01")).toBe("01-01-2026");
  });
});
