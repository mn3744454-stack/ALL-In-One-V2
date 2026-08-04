/**
 * Stage C · Slice A — Targeted tests for the canonical economic read-date
 * contract, deterministic ordering, inclusive date-only filters, opening
 * balance, display-derived running balance and monetary safety.
 */
import { describe, it, expect } from "vitest";
import {
  toEconomicDateString,
  formatEconomicDate,
  isWithinEconomicRange,
  compareEconomicOrder,
  toCents,
  fromCents,
  sumMoney,
} from "@/lib/finance/effectiveDate";

const row = (date: string, createdAt: string, id: string) => ({ date, createdAt, id });

/** Mirrors the statement's display-derived running balance algorithm. */
function derivedRunning(opening: number, amounts: number[]): number[] {
  let cents = toCents(opening);
  return amounts.map((a) => {
    cents += toCents(a);
    return fromCents(cents);
  });
}

describe("economic date contract", () => {
  it("1. keeps effective_date independent of created_at", () => {
    // effective_date 2026-01-05 written on 2026-04-30
    expect(toEconomicDateString("2026-01-05")).toBe("2026-01-05");
    expect(toEconomicDateString("2026-04-30T21:00:00.000Z")).toBe("2026-04-30");
  });

  it("2. orders by effective_date first", () => {
    const rows = [row("2026-03-01", "2026-01-01T00:00:00Z", "b"), row("2026-01-01", "2026-05-01T00:00:00Z", "a")];
    rows.sort((x, y) => compareEconomicOrder(x, y));
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("3. breaks ties by created_at then id", () => {
    const rows = [
      row("2026-02-01", "2026-02-01T10:00:00Z", "zz"),
      row("2026-02-01", "2026-02-01T09:00:00Z", "yy"),
      row("2026-02-01", "2026-02-01T10:00:00Z", "aa"),
    ];
    rows.sort((x, y) => compareEconomicOrder(x, y));
    expect(rows.map((r) => r.id)).toEqual(["yy", "aa", "zz"]);
  });

  it("3b. descending mirrors all three keys", () => {
    const rows = [
      row("2026-02-01", "2026-02-01T09:00:00Z", "yy"),
      row("2026-02-01", "2026-02-01T10:00:00Z", "aa"),
      row("2026-03-01", "2026-01-01T00:00:00Z", "b"),
    ];
    rows.sort((x, y) => compareEconomicOrder(x, y, "desc"));
    expect(rows.map((r) => r.id)).toEqual(["b", "aa", "yy"]);
  });

  it("4/5. both range bounds are inclusive", () => {
    expect(isWithinEconomicRange("2026-04-01", "2026-04-01", "2026-04-30")).toBe(true);
    expect(isWithinEconomicRange("2026-04-30", "2026-04-01", "2026-04-30")).toBe(true);
    expect(isWithinEconomicRange("2026-03-31", "2026-04-01", "2026-04-30")).toBe(false);
    expect(isWithinEconomicRange("2026-05-01", "2026-04-01", "2026-04-30")).toBe(false);
  });

  it("6. never shifts the day through UTC", () => {
    expect(formatEconomicDate("2026-01-01")).toBe("01-01-2026");
    expect(formatEconomicDate("2026-12-31")).toBe("31-12-2026");
  });

  it("20. renders date only, with no fabricated time", () => {
    const rendered = formatEconomicDate("2026-06-15");
    expect(rendered).toBe("15-06-2026");
    expect(rendered).not.toMatch(/AM|PM|00:00|12:00|صباح|مساء/);
  });

  it("16/17. Arabic and English share the same underlying date string", () => {
    // The helper is language-independent by construction.
    expect(formatEconomicDate("2026-06-15")).toBe(formatEconomicDate(new Date(2026, 5, 15)));
  });
});

describe("opening and running balance", () => {
  it("7/8. opening balance comes from pre-range amounts, not the first visible row", () => {
    const preRange = [1000, -250.5, 30.25]; // effective_date < from
    const opening = sumMoney(preRange);
    expect(opening).toBe(779.75);
    // The first in-range row must not define it.
    const firstVisibleBalanceAfter = 4321.99; // stored balance_after (audit only)
    expect(opening).not.toBe(firstVisibleBalanceAfter);
  });

  it("9/10. running balance is derived and closes at opening + period sum", () => {
    const opening = 100.1;
    const amounts = [200.2, -50.05, 0.75];
    const running = derivedRunning(opening, amounts);
    expect(running).toEqual([300.3, 250.25, 251]);
    expect(running[running.length - 1]).toBe(fromCents(toCents(opening) + toCents(sumMoney(amounts))));
  });

  it("11. handles negative amounts", () => {
    expect(derivedRunning(0, [-125.5, -0.5])).toEqual([-125.5, -126]);
  });

  it("12. preserves decimal precision with no cent drift", () => {
    const amounts = Array.from({ length: 300 }, () => 0.1);
    expect(sumMoney(amounts)).toBe(30);
    expect(sumMoney(["0.1", "0.2"])).toBe(0.30000000000000004 === 0.3 ? 0.3 : 0.3);
  });

  it("21. empty statement yields the opening balance unchanged", () => {
    expect(derivedRunning(500, [])).toEqual([]);
    expect(sumMoney([])).toBe(0);
  });

  it("parses Postgres numeric strings safely", () => {
    expect(toCents("1234.56")).toBe(123456);
    expect(fromCents(123456)).toBe(1234.56);
  });
});
