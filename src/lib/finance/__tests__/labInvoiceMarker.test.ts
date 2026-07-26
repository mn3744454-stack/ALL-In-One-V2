import { describe, expect, it } from "vitest";
import {
  LAB_SOURCE_MARKER_RE,
  buildLabSourceMarker,
  parseLabSourceMarker,
  stripLabSourceMarker,
} from "../labInvoiceMarker";

const UUID = "f312b261-8e31-4937-a54b-0a190cbfed86";
const MARKER = `[LAB:lab_sample:${UUID}]`;

describe("labInvoiceMarker.parseLabSourceMarker", () => {
  it("parses a marker preceded by a user note", () => {
    const res = parseLabSourceMarker(`Urgent client request\n${MARKER}`);
    expect(res).toEqual({ sourceType: "lab_sample", sourceId: UUID });
  });

  it("parses lab_request marker", () => {
    const res = parseLabSourceMarker(`[LAB:lab_request:${UUID}]`);
    expect(res).toEqual({ sourceType: "lab_request", sourceId: UUID });
  });

  it("returns null for empty / plain text / malformed markers", () => {
    expect(parseLabSourceMarker(null)).toBeNull();
    expect(parseLabSourceMarker(undefined)).toBeNull();
    expect(parseLabSourceMarker("")).toBeNull();
    expect(parseLabSourceMarker("no marker here")).toBeNull();
    expect(parseLabSourceMarker("[LAB:foo]")).toBeNull();
    expect(parseLabSourceMarker("[LAB:lab_sample:not-a-uuid]")).toBeNull();
    expect(parseLabSourceMarker("[URGENT] check horse")).toBeNull();
  });

  it("regex source is stable", () => {
    expect(LAB_SOURCE_MARKER_RE.test(MARKER)).toBe(true);
  });
});

describe("labInvoiceMarker.stripLabSourceMarker", () => {
  it("returns empty when only the marker is stored", () => {
    expect(stripLabSourceMarker(MARKER)).toBe("");
    expect(stripLabSourceMarker(`\n${MARKER}\n`)).toBe("");
  });

  it("keeps only the user note when marker follows it", () => {
    expect(stripLabSourceMarker(`Urgent client request\n${MARKER}`)).toBe(
      "Urgent client request",
    );
  });

  it("keeps only the user note when marker precedes it", () => {
    expect(stripLabSourceMarker(`${MARKER}\nUrgent client request`)).toBe(
      "Urgent client request",
    );
  });

  it("preserves unrelated bracketed text", () => {
    expect(stripLabSourceMarker("[URGENT] check horse")).toBe(
      "[URGENT] check horse",
    );
    expect(stripLabSourceMarker(`[URGENT] check horse\n${MARKER}`)).toBe(
      "[URGENT] check horse",
    );
  });

  it("never surfaces the marker or UUID in output", () => {
    const out = stripLabSourceMarker(`Note above\n${MARKER}\nNote below`);
    expect(out).not.toContain("[LAB:");
    expect(out).not.toContain(UUID);
    expect(out).toContain("Note above");
    expect(out).toContain("Note below");
  });

  it("preserves internal newlines in multiline user notes", () => {
    const notes = `Line one\nLine two\n\nLine four\n${MARKER}`;
    expect(stripLabSourceMarker(notes)).toBe(
      "Line one\nLine two\n\nLine four",
    );
  });

  it("returns empty for null/undefined/empty input", () => {
    expect(stripLabSourceMarker(null)).toBe("");
    expect(stripLabSourceMarker(undefined)).toBe("");
    expect(stripLabSourceMarker("")).toBe("");
  });
});

describe("labInvoiceMarker.buildLabSourceMarker", () => {
  it("produces the exact stored format", () => {
    expect(buildLabSourceMarker("lab_sample", UUID)).toBe(MARKER);
    expect(buildLabSourceMarker("lab_request", UUID)).toBe(
      `[LAB:lab_request:${UUID}]`,
    );
  });
});
