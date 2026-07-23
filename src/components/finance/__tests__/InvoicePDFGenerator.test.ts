/// <reference types="node" />
import { describe, expect, it } from "vitest";
import {
  __createInvoiceHTMLForTest,
  buildInvoicePdfFilename,
  buildInvoicePdfTitle,
  sanitizeFilenameFragment,
  type InvoicePDFLabels,
} from "../InvoicePDFGenerator";

const arLabels: InvoicePDFLabels = {
  invoice: "فاتورة",
  billTo: "إلى",
  issueDate: "تاريخ الإصدار",
  dueDate: "تاريخ الاستحقاق",
  description: "الوصف",
  quantity: "الكمية",
  unitPrice: "سعر الوحدة",
  total: "الإجمالي",
  subtotal: "المجموع الفرعي",
  tax: "الضريبة",
  discount: "الخصم",
  notes: "ملاحظات",
  thankYou: "شكرًا",
  clientLevelCharges: "رسوم على العميل",
  unassignedHorse: "غير مرتبط بخيل",
  included: "متضمن",
  packageChip: "باقة",
  horseGroupLabel: "الخيل",
};

const enLabels: InvoicePDFLabels = {
  invoice: "Invoice",
  billTo: "Bill To",
  issueDate: "Issue Date",
  dueDate: "Due Date",
  description: "Description",
  quantity: "Qty",
  unitPrice: "Unit Price",
  total: "Total",
  subtotal: "Subtotal",
  tax: "Tax",
  discount: "Discount",
  notes: "Notes",
  thankYou: "Thank you",
  clientLevelCharges: "Client-Level Charges",
  unassignedHorse: "Unassigned",
  included: "Included",
  packageChip: "Package",
  horseGroupLabel: "Horse",
};

const baseInvoice = {
  id: "inv-1",
  invoice_number: "INV-0986",
  client_name: "نواف فضوه المطيري",
  issue_date: "2026-07-23",
  due_date: "2026-08-01",
  subtotal: 650,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 650,
  currency: "SAR",
  notes: "",
} as any;

const horseItem = (overrides: Record<string, unknown> = {}) => ({
  id: overrides.id ?? "it-1",
  invoice_id: "inv-1",
  description: "زيارة طوارئ",
  quantity: 1,
  unit_price: 650,
  total_price: 650,
  horse_id: "h1",
  resolvedHorseNameAr: "فاتن",
  resolvedHorseNameEn: "Fatin",
  ...overrides,
});

describe("buildInvoicePdfFilename", () => {
  it("returns Arabic business filename", () => {
    expect(buildInvoicePdfFilename("ar", "INV-0986")).toBe("فاتورة INV-0986.pdf");
  });
  it("returns English business filename", () => {
    expect(buildInvoicePdfFilename("en", "INV-0986")).toBe("Invoice INV-0986.pdf");
  });
  it("falls back to localized Draft when the invoice number is missing", () => {
    expect(buildInvoicePdfFilename("ar", "")).toBe("فاتورة مسودة.pdf");
    expect(buildInvoicePdfFilename("en", null)).toBe("Invoice Draft.pdf");
    expect(buildInvoicePdfFilename("ar", undefined)).toBe("فاتورة مسودة.pdf");
  });
  it("never produces a UUID or internal id fallback", () => {
    const out = buildInvoicePdfFilename("en", "   ");
    expect(out).toBe("Invoice Draft.pdf");
    expect(out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });
  it("preserves Arabic Unicode inside the invoice number fragment", () => {
    expect(buildInvoicePdfFilename("ar", "فتر-01")).toBe("فاتورة فتر-01.pdf");
  });
  it("sanitizes invalid filename characters", () => {
    const out = buildInvoicePdfFilename("en", 'INV/09*86:"x"');
    expect(out).toBe("Invoice INV-09-86---x-.pdf");
    expect(out).not.toMatch(/[\/\\:*?"<>|]/);
  });
  it("normalizes whitespace", () => {
    expect(sanitizeFilenameFragment("  INV   0986  ")).toBe("INV 0986");
  });
  it("title strips the .pdf extension", () => {
    expect(buildInvoicePdfTitle("ar", "INV-0986")).toBe("فاتورة INV-0986");
    expect(buildInvoicePdfTitle("en", "INV-0986")).toBe("Invoice INV-0986");
  });
});

describe("createInvoiceHTML — Arabic direction & bidi isolation", () => {
  it("emits lang=ar and dir=rtl on the root", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    expect(html).toMatch(/lang="ar"/);
    expect(html).toMatch(/dir="rtl"/);
  });

  it("carries structural Arabic labels in logical Unicode order", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: { ...baseInvoice, tax_amount: 45 },
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    for (const label of [
      "فاتورة",
      "تاريخ الإصدار",
      "تاريخ الاستحقاق",
      "الوصف",
      "الكمية",
      "سعر الوحدة",
      "المجموع الفرعي",
      "الضريبة",
      "الإجمالي",
    ]) {
      expect(html).toContain(label);
    }
    // No character-level reversal artifacts
    expect(html).not.toContain("ةروتاف");
  });

  it("isolates the invoice number as LTR bdi", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    expect(html).toMatch(/<bdi[^>]*dir="ltr"[^>]*>#INV-0986<\/bdi>/);
  });

  it("isolates dates and currency as LTR bdi", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: { ...baseInvoice, tax_amount: 45, total_amount: 695 },
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    // Currency value wrapped in ltr bdi
    expect(html).toMatch(/<bdi[^>]*dir="ltr"[^>]*>SAR/);
    // Date value wrapped in ltr bdi (formatted output contains digits)
    expect(html).toMatch(/تاريخ الإصدار:\s*<bdi[^>]*dir="ltr"/);
  });

  it("wraps the English horse-secondary fragment INCLUDING parentheses in LTR bdi", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    // Arabic label + primary name are outside; secondary "(Fatin)" is fully isolated
    expect(html).toMatch(/الخيل:\s*<bdi[^>]*dir="auto"[^>]*>فاتن<\/bdi>/);
    expect(html).toMatch(/<bdi[^>]*dir="ltr"[^>]*>\(Fatin\)<\/bdi>/);
  });

  it("wraps dynamic descriptions in auto-direction bdi", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem({ description: "زيارة طوارئ" })],
      lang: "ar",
      labels: arLabels,
    } as any);
    expect(html).toMatch(/<bdi[^>]*dir="auto"[^>]*>زيارة طوارئ<\/bdi>/);
  });

  it("hides the tax row when tax_amount = 0", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem()],
      lang: "ar",
      labels: arLabels,
    } as any);
    // The tax label appears in the totals row only when > 0; the header still has table labels but not a totals-line tax
    const totalsBlock = html.split("<!-- Totals -->")[1] ?? "";
    expect(totalsBlock).not.toContain("الضريبة");
  });
});

describe("createInvoiceHTML — English regression", () => {
  it("keeps lang=en dir=ltr and unchanged structural labels", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [horseItem()],
      lang: "en",
      labels: enLabels,
    } as any);
    expect(html).toMatch(/lang="en"/);
    expect(html).toMatch(/dir="ltr"/);
    for (const label of ["Invoice", "Bill To", "Description", "Qty", "Unit Price", "Total", "Subtotal"]) {
      expect(html).toContain(label);
    }
  });

  it("wraps the Arabic horse-secondary fragment INCLUDING parentheses in RTL bdi", () => {
    const html = __createInvoiceHTMLForTest({
      invoice: baseInvoice,
      items: [
        horseItem({ resolvedHorseNameAr: "فاتن", resolvedHorseNameEn: "Fatin" }),
      ],
      lang: "en",
      labels: enLabels,
    } as any);
    expect(html).toMatch(/Horse:\s*<bdi[^>]*dir="auto"[^>]*>Fatin<\/bdi>/);
    expect(html).toMatch(/<bdi[^>]*dir="rtl"[^>]*>\(فاتن\)<\/bdi>/);
  });
});
