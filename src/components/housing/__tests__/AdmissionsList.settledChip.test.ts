import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * B2-F1-F7 regression test.
 *
 * The Settled / مسدد financial filter chip MUST render unconditionally,
 * even when `counts.settled === 0`. Hiding it at zero (as was the case
 * before the F7 fix) prevents users from filtering to "no outstanding
 * boarding balances" and breaks parity with the peer chips
 * `accrued_unbilled` and `outstanding`, which always render.
 *
 * This test guards against a regression where someone re-wraps the
 * Settled TabsTrigger in a `counts.settled > 0 && (...)` conditional.
 */
describe("AdmissionsList — Settled chip visibility (B2-F1-F7)", () => {
  const source = readFileSync(
    path.resolve(__dirname, "../AdmissionsList.tsx"),
    "utf8"
  );

  it("renders the settled TabsTrigger unconditionally", () => {
    expect(source).toMatch(/<TabsTrigger\s+value="settled"/);
  });

  it("does NOT wrap the settled TabsTrigger in a counts.settled > 0 guard", () => {
    // Look for the dangerous pattern that would hide the chip at zero.
    expect(source).not.toMatch(
      /counts\.settled\s*>\s*0\s*&&\s*\(\s*\n?\s*<TabsTrigger\s+value="settled"/
    );
  });

  it("uses the correct i18n key for the settled chip label", () => {
    expect(source).toMatch(/housing\.admissions\.subFilters\.settled/);
  });

  it("keeps peer chips (accrued_unbilled, outstanding) unconditional for symmetry", () => {
    // These are the symmetric peers — if either becomes conditional,
    // the Settled chip would need re-evaluation too.
    expect(source).not.toMatch(
      /counts\.accruedUnbilled\s*>\s*0\s*&&\s*\(\s*\n?\s*<TabsTrigger\s+value="accrued_unbilled"/
    );
    expect(source).not.toMatch(
      /counts\.outstanding\s*>\s*0\s*&&\s*\(\s*\n?\s*<TabsTrigger\s+value="outstanding"/
    );
  });
});
