/// <reference types="node" />
import { describe, expect, it } from "vitest";
import {
  __createInvoiceHTMLForTest,
  type InvoicePDFLabels,
} from "../InvoicePDFGenerator";
import type { InvoicePaymentSummaryForPdf } from "@/lib/finance/fetchInvoicePaymentSummary";

const labels: InvoicePDFLabels = {
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
  paymentStatusLabel: "Payment Status",
  statusUnpaid: "Unpaid",
  statusPartial: "Partially Paid",
  statusPaid: "Paid in Full",
  paidToDate: "Paid to Date",
  outstanding: "Outstanding",
  paymentHistoryHeading: "Payment History",
  colMethod: "Method",
  colEffectiveDate: "Effective Date",
  colRecordedAt: "Recorded At",
  colAmount: "Amount",
  methodLabels: { cash: "Cash", card: "Card", transfer: "Bank Transfer", check: "Check" },
};

const invoice = {
  id: "inv-1",
  invoice_number: "INV-9920",
  client_name: "Al-Qimah Stable",
  issue_date: "2026-07-26",
  due_date: null,
  subtotal: 230,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 230,
  currency: "SAR",
  notes: "",
} as any;

const items = [
  {
    id: "it-1", invoice_id: "inv-1", description: "Boarding",
    quantity: 1, unit_price: 230, total_price: 230, horse_id: null,
  } as any,
];

const paidSummary: InvoicePaymentSummaryForPdf = {
  status: "paid",
  paidAmount: 230,
  outstandingAmount: 0,
  totalAmount: 230,
  payments: [
    {
      id: "p1", amount: 20, payment_method: "transfer",
      effective_date: "2026-07-26", created_at: "2026-07-26T17:26:00Z", reference: null,
    },
    {
      id: "p2", amount: 210, payment_method: "cash",
      effective_date: "2026-07-26", created_at: "2026-07-26T17:27:00Z", reference: null,
    },
  ],
};

describe("Invoice PDF payment disclosure", () => {
  it("omits the payment summary block when no summary is supplied", () => {
    const html = __createInvoiceHTMLForTest({ invoice, items, lang: "en", labels });
    expect(html).not.toContain("Payment Status");
    expect(html).not.toContain("Paid to Date");
    expect(html).not.toContain("Payment History");
  });

  it("renders the always-visible summary block when a summary is supplied", () => {
    const html = __createInvoiceHTMLForTest({
      invoice, items, lang: "en", labels, paymentSummary: paidSummary,
    });
    expect(html).toContain("Payment Status");
    expect(html).toContain("Paid in Full");
    expect(html).toContain("Paid to Date");
    expect(html).toContain("Outstanding");
    // Detailed history is opt-in and OFF by default
    expect(html).not.toContain("Payment History");
  });

  it("renders the history table only when includePaymentHistory is true", () => {
    const html = __createInvoiceHTMLForTest({
      invoice, items, lang: "en", labels,
      paymentSummary: paidSummary, includePaymentHistory: true,
    });
    expect(html).toContain("Payment History");
    expect(html).toContain("Bank Transfer");
    expect(html).toContain("Cash");
    // English AM/PM label from formatStandardDateTime
    expect(html).toMatch(/\d{2}-\d{2}-\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)/);
  });

  it("uses Arabic status label under ar locale", () => {
    const arLabels: InvoicePDFLabels = {
      ...labels,
      statusPaid: "مدفوعة بالكامل",
      paymentStatusLabel: "حالة الدفع",
    };
    const html = __createInvoiceHTMLForTest({
      invoice, items, lang: "ar", labels: arLabels, paymentSummary: paidSummary,
    });
    expect(html).toContain("حالة الدفع");
    expect(html).toContain("مدفوعة بالكامل");
  });

  it("does not render the history section when the summary has zero payments", () => {
    const empty: InvoicePaymentSummaryForPdf = {
      status: "unpaid", paidAmount: 0, outstandingAmount: 230, totalAmount: 230, payments: [],
    };
    const html = __createInvoiceHTMLForTest({
      invoice, items, lang: "en", labels,
      paymentSummary: empty, includePaymentHistory: true,
    });
    expect(html).toContain("Unpaid");
    expect(html).not.toContain("Payment History");
  });
});
