/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * B2-F1-F7 regression test.
 *
 * The Settled / مسدد financial filter chip MUST render unconditionally,
 * even when `counts.settled === 0`. Hiding it at zero (the pre-F7 bug)
 * broke parity with the peer chips `accrued_unbilled` and `outstanding`,
 * which always render, and prevented users from filtering to settled
 * boarding admissions when none currently match.
 *
 * Guards against re-wrapping the Settled TabsTrigger in a
 * `counts.settled > 0 && (...)` conditional.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../AdmissionsList.tsx"), "utf8");

describe("AdmissionsList — Settled chip visibility (B2-F1-F7)", () => {
  it("renders the settled TabsTrigger", () => {
    expect(source).toMatch(/<TabsTrigger\s+value="settled"/);
  });

  it("does NOT wrap the settled TabsTrigger in a counts.settled > 0 guard", () => {
    expect(source).not.toMatch(
      /counts\.settled\s*>\s*0\s*&&\s*\(\s*<TabsTrigger\s+value="settled"/s
    );
  });

  it("uses the correct i18n key for the settled chip label", () => {
    expect(source).toMatch(/housing\.admissions\.subFilters\.settled/);
  });

  it("keeps peer chips (accrued_unbilled, outstanding) unconditional for symmetry", () => {
    expect(source).not.toMatch(
      /counts\.accruedUnbilled\s*>\s*0\s*&&\s*\(\s*<TabsTrigger\s+value="accrued_unbilled"/s
    );
    expect(source).not.toMatch(
      /counts\.outstanding\s*>\s*0\s*&&\s*\(\s*<TabsTrigger\s+value="outstanding"/s
    );
  });
});
