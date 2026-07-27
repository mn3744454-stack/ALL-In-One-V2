import { describe, expect, it } from "vitest";
import {
  evaluateDraft,
  normalizeDraft,
  shouldBlockKey,
} from "../financialAmountInputLogic";

describe("financialAmountInputLogic.normalizeDraft", () => {
  it("converts Arabic-Indic digits to ASCII", () => {
    expect(normalizeDraft("٤٣٫٢٥")).toBe("43.25");
    expect(normalizeDraft("۴۳٫۲۵")).toBe("43.25");
  });
  it("converts comma decimal separator to dot", () => {
    expect(normalizeDraft("43,25")).toBe("43.25");
  });
  it("leaves ASCII digits alone", () => {
    expect(normalizeDraft("43.25")).toBe("43.25");
  });
});

describe("financialAmountInputLogic.evaluateDraft", () => {
  it("commits a plain decimal draft as a number rounded to 2dp", () => {
    const r = evaluateDraft("43.256");
    expect(r).toEqual({ kind: "commit", value: 43.26, normalized: "43.256" });
  });
  it("commits an empty draft as null (no value)", () => {
    expect(evaluateDraft("")).toEqual({ kind: "commit", value: null, normalized: "" });
  });
  it("commits '.' as null (still typing)", () => {
    expect(evaluateDraft(".")).toEqual({ kind: "commit", value: null, normalized: "." });
  });
  it("rejects letters as malformed (no commit)", () => {
    const r = evaluateDraft("43e2");
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.reason).toBe("malformed");
  });
  it("rejects negatives as malformed (no commit)", () => {
    const r = evaluateDraft("-5");
    expect(r.kind).toBe("invalid");
  });
  it("holds over-max drafts locally (no commit, over-max reason)", () => {
    // Screenshot-92: attempted 500 against cap 432.50
    const r = evaluateDraft("500", { max: 432.5 });
    expect(r).toEqual({ kind: "invalid", reason: "over-max", normalized: "500" });
  });
  it("commits an under-max draft as a number", () => {
    const r = evaluateDraft("400", { max: 432.5 });
    expect(r).toEqual({ kind: "commit", value: 400, normalized: "400" });
  });
  it("commits exactly-at-max as valid", () => {
    const r = evaluateDraft("432.50", { max: 432.5 });
    expect(r.kind).toBe("commit");
    if (r.kind === "commit") expect(r.value).toBe(432.5);
  });
});

describe("financialAmountInputLogic.shouldBlockKey", () => {
  it("blocks ArrowUp / ArrowDown so spinners cannot mutate the value", () => {
    expect(shouldBlockKey("ArrowUp")).toBe(true);
    expect(shouldBlockKey("ArrowDown")).toBe(true);
  });
  it("blocks scientific-notation and sign characters", () => {
    expect(shouldBlockKey("e")).toBe(true);
    expect(shouldBlockKey("E")).toBe(true);
    expect(shouldBlockKey("+")).toBe(true);
    expect(shouldBlockKey("-")).toBe(true);
  });
  it("allows normal typing keys", () => {
    expect(shouldBlockKey("1")).toBe(false);
    expect(shouldBlockKey(".")).toBe(false);
    expect(shouldBlockKey("Backspace")).toBe(false);
    expect(shouldBlockKey("Tab")).toBe(false);
  });
});
