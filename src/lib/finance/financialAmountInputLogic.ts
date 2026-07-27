/**
 * Slice 3.3 — pure logic behind the FinancialAmountInput component.
 * Node-env safe (no React, no DOM) so it can be unit-tested directly.
 */

const NUMERIC_DRAFT_RE = /^\d*(?:[.,]\d*)?$/;

export function normalizeDraft(raw: string): string {
  return raw
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[,\u066B]/g, ".");
}

export type DraftOutcome =
  | { kind: "commit"; value: number | null; normalized: string }
  | { kind: "invalid"; reason: "over-max" | "malformed"; normalized: string };

/**
 * Given the raw string a user just typed into a money field, decide whether
 * to commit a number upward, commit null (empty), or hold locally without
 * committing (over-max / malformed).
 */
export function evaluateDraft(
  raw: string,
  opts: { max?: number; decimals?: number } = {},
): DraftOutcome {
  const decimals = opts.decimals ?? 2;
  const normalized = normalizeDraft(raw);

  if (normalized !== "" && !NUMERIC_DRAFT_RE.test(normalized)) {
    return { kind: "invalid", reason: "malformed", normalized };
  }
  if (normalized === "" || normalized === ".") {
    return { kind: "commit", value: null, normalized };
  }
  const parsed = parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { kind: "invalid", reason: "malformed", normalized };
  }
  if (typeof opts.max === "number" && parsed > opts.max + 1e-9) {
    return { kind: "invalid", reason: "over-max", normalized };
  }
  const factor = Math.pow(10, decimals);
  return {
    kind: "commit",
    value: Math.round(parsed * factor) / factor,
    normalized,
  };
}

/** Keys that money fields must ignore/block. */
export const BLOCKED_KEYS = new Set(["ArrowUp", "ArrowDown", "e", "E", "+", "-"]);
export function shouldBlockKey(key: string): boolean {
  return BLOCKED_KEYS.has(key);
}
