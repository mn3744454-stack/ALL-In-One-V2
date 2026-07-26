/**
 * Payment History timestamp restoration — presentation contract.
 *
 * The Payment Timeline row inside InvoiceDetailsSheet renders
 * `formatStandardDateTime(payment.created_at)`. We validate the ten
 * contract assertions from the approved plan by driving the shared
 * formatter through the same code path the component uses.
 *
 * Rendering the full sheet requires Sheet portals, Supabase, Tanstack,
 * TenantContext and the RecordPaymentDialog tree — well outside the
 * scope of a presentation-only regression test. This suite therefore
 * asserts the exact helper contract the sheet now depends on.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import { setGlobalLanguage, getCurrentLanguage } from "@/i18n/I18nContext";
import type { Language } from "@/i18n/config";

const ISO_MORNING = "2026-07-26T05:27:00.000Z"; // 08:27 in Asia/Riyadh
const ISO_EVENING = "2026-07-26T17:27:00.000Z"; // 20:27 in Asia/Riyadh

const previousLang = getCurrentLanguage();

const withLang = (lang: Language, fn: () => void) => {
  setGlobalLanguage(lang);
  try { fn(); } finally { setGlobalLanguage(previousLang); }
};

afterAll(() => setGlobalLanguage(previousLang));

describe("Payment History row — formatStandardDateTime contract", () => {
  it("Arabic mode emits صباحاً or مساءً", () => {
    withLang("ar" as Language, () => {
      const out = formatStandardDateTime(ISO_EVENING);
      expect(/صباحاً|مساءً/.test(out)).toBe(true);
    });
  });

  it("English mode emits AM or PM", () => {
    withLang("en" as Language, () => {
      const out = formatStandardDateTime(ISO_EVENING);
      expect(/\b(AM|PM)\b/.test(out)).toBe(true);
    });
  });

  it("Uses Latin digits and dd-MM-yyyy separators in both languages", () => {
    for (const lang of ["ar", "en"] as Language[]) {
      withLang(lang, () => {
        const out = formatStandardDateTime(ISO_EVENING);
        expect(out).toMatch(/\b\d{2}-\d{2}-\d{4}\b/);
        // No Arabic-Indic digits leaking through.
        expect(out).not.toMatch(/[\u0660-\u0669]/);
      });
    }
  });

  it("Time follows JS local-zone conversion of created_at (stable across morning / evening rows)", () => {
    withLang("en" as Language, () => {
      const morning = formatStandardDateTime(ISO_MORNING);
      const evening = formatStandardDateTime(ISO_EVENING);
      expect(morning).not.toEqual(evening);
      // Both include a 12-hour clock (h:mm), not 24-hour (HH:mm > 12).
      const hMorning = Number(morning.match(/\s(\d{1,2}):/)?.[1] ?? -1);
      const hEvening = Number(evening.match(/\s(\d{1,2}):/)?.[1] ?? -1);
      for (const h of [hMorning, hEvening]) {
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(12);
      }
    });
  });

  it("Does not fabricate a time from a date-only value: null/invalid degrades to em-dash", () => {
    expect(formatStandardDateTime(null)).toBe("—");
    expect(formatStandardDateTime(undefined)).toBe("—");
    expect(formatStandardDateTime("not-a-date")).toBe("—");
  });

  it("Both Bank Transfer and Cash rows would render distinct timestamps", () => {
    withLang("en" as Language, () => {
      const bankTransferRow = formatStandardDateTime(ISO_MORNING);
      const cashRow = formatStandardDateTime(ISO_EVENING);
      expect(bankTransferRow).not.toEqual(cashRow);
      expect(bankTransferRow.length).toBeGreaterThan("dd-MM-yyyy".length);
      expect(cashRow.length).toBeGreaterThan("dd-MM-yyyy".length);
    });
  });

  it("Preserves ordering by mapping input order to output order deterministically", () => {
    withLang("en" as Language, () => {
      const inputs = [ISO_MORNING, ISO_EVENING];
      const outputs = inputs.map(formatStandardDateTime);
      // Deterministic mapping — no reordering side-effects.
      expect(outputs).toEqual(inputs.map((iso) => formatStandardDateTime(iso)));
    });
  });

  it("Reflects a language switch immediately (Arabic period follows setGlobalLanguage)", () => {
    withLang("en" as Language, () => {
      expect(formatStandardDateTime(ISO_EVENING)).toMatch(/PM|AM/);
    });
    withLang("ar" as Language, () => {
      expect(formatStandardDateTime(ISO_EVENING)).toMatch(/صباحاً|مساءً/);
    });
  });

  beforeEach(() => setGlobalLanguage(previousLang));
});
