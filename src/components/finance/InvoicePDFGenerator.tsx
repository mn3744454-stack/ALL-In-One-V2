import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DOMPurify from "dompurify";
import { formatStandardDate, formatStandardDateTime } from "@/lib/displayHelpers";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import {
  buildInvoicePresentation,
  formatHorseHeadingParts,
  type RawInvoiceItemForPresentation,
} from "@/lib/finance/invoicePresentation";
import type { InvoicePaymentSummaryForPdf } from "@/lib/finance/fetchInvoicePaymentSummary";
import {
  paginateIntoPages,
  applyPageNumberFooters,
} from "./invoicePaginator";

/**
 * Phase N+1A refinement — strict localized labels bundle. Both call sites
 * (InvoiceDetailsSheet + InvoicesList) MUST supply the complete contract so
 * Arabic output never falls back to hardcoded English literals.
 *
 * Slice 2.2D additions: `continuationSuffix`, `pageOf` — both consumed by the
 * shared paginator. `pageOf` MUST use Latin digits and contain the
 * placeholders `{current}` and `{total}`.
 */
export interface InvoicePDFLabels {
  invoice: string;
  billTo: string;
  issueDate: string;
  dueDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  notes: string;
  thankYou: string;
  clientLevelCharges: string;
  unassignedHorse: string;
  included: string;
  packageChip: string;
  horseGroupLabel: string;
  paymentStatusLabel: string;
  statusUnpaid: string;
  statusPartial: string;
  statusPaid: string;
  paidToDate: string;
  outstanding: string;
  paymentHistoryHeading: string;
  colMethod: string;
  colEffectiveDate: string;
  colRecordedAt: string;
  colAmount: string;
  methodLabels: Record<string, string>;
  pdfPaymentSession?: {
    sessionLabel: string;
    methodsHeading: string;
    distributionHeading: string;
    horseColumn: string;
    clientLevelLabel: string;
    historicalLabel: string;
    sessionTotal: string;
  };
  /** Slice 2.2D — " — Continued" / " — تابع". Appended to a repeated heading. */
  continuationSuffix: string;
  /** Slice 2.2D — "Page {current} of {total}" / "الصفحة {current} من {total}". Latin digits only. */
  pageOf: string;
}

interface GeneratePDFOptions {
  invoice: Invoice;
  items: InvoiceItem[];
  tenantName?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  /** 'en' | 'ar' — drives snapshot preference, dir, lang, alignment, and font. */
  lang: string;
  /** Complete localized labels contract — required. */
  labels: InvoicePDFLabels;
  /** Ledger-truth payment summary. When present, renders the summary block. */
  paymentSummary?: InvoicePaymentSummaryForPdf | null;
  /** Opt-in — user chose to include the detailed payment history table. */
  includePaymentHistory?: boolean;
}

const escapeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ────────────────────────────────────────────────────────────────────────────
// Filename / title builders — unchanged from Phase N+1A closure.
// ────────────────────────────────────────────────────────────────────────────

const FILENAME_INVALID_CHARS = /[/\\:*?"<>|\u0000-\u001F]/g;

export const sanitizeFilenameFragment = (raw: string): string =>
  String(raw ?? "")
    .replace(FILENAME_INVALID_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim();

export const buildInvoicePdfFilename = (
  lang: string,
  invoiceNumber: string | null | undefined,
): string => {
  const isAr = lang === "ar";
  const title = isAr ? "فاتورة" : "Invoice";
  const fallback = isAr ? "مسودة" : "Draft";
  const cleaned = sanitizeFilenameFragment(invoiceNumber ?? "");
  const number = cleaned.length > 0 ? cleaned : fallback;
  return `${title} ${number}.pdf`;
};

export const buildInvoicePdfTitle = (
  lang: string,
  invoiceNumber: string | null | undefined,
): string => buildInvoicePdfFilename(lang, invoiceNumber).replace(/\.pdf$/, "");

// ────────────────────────────────────────────────────────────────────────────
// Page geometry — canonical A4 portrait (see plan §G).
// ────────────────────────────────────────────────────────────────────────────
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 12;
const FOOTER_STRIP_MM = 10;
// Usable content height = 297 - 12 (top pad) - 12 (bottom pad) - 10 (footer)
// ≈ 263 mm. At 96 dpi CSS pixel: 1 mm ≈ 3.7795 px → ≈ 993 px.
const USABLE_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_PADDING_MM * 2 - FOOTER_STRIP_MM;
const MM_TO_PX = 96 / 25.4;
const USABLE_HEIGHT_PX = USABLE_HEIGHT_MM * MM_TO_PX;

// ────────────────────────────────────────────────────────────────────────────
// HTML template — annotates every logical block with `data-block` metadata.
// ────────────────────────────────────────────────────────────────────────────

const createInvoiceHTML = (options: GeneratePDFOptions): string => {
  const {
    invoice, items, tenantName, tenantAddress, tenantPhone, tenantEmail, lang, labels,
    paymentSummary, includePaymentHistory,
  } = options;

  const isAr = lang === "ar";
  const startAlign = isAr ? "right" : "left";
  const endAlign = isAr ? "left" : "right";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "SAR",
    }).format(amount);

  const ltrBdi = (inner: string) =>
    `<bdi dir="ltr" style="unicode-bidi:isolate;">${inner}</bdi>`;
  const rtlBdi = (inner: string) =>
    `<bdi dir="rtl" style="unicode-bidi:isolate;">${inner}</bdi>`;
  const autoBdi = (inner: string) =>
    `<bdi dir="auto" style="unicode-bidi:isolate;">${inner}</bdi>`;

  const presentation = buildInvoicePresentation(
    items as unknown as RawInvoiceItemForPresentation[],
    { lang, clientLevelLabel: labels.clientLevelCharges },
  );

  // ─── Header block ───────────────────────────────────────────────────────
  const headerBlock = `
    <div data-block="header" style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: flex-start; gap: 24px; break-inside: avoid;">
      <div style="text-align: ${startAlign};">
        <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1e3a5f;">${autoBdi(escapeHtml(tenantName || ""))}</h1>
        ${tenantAddress ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${autoBdi(escapeHtml(tenantAddress))}</p>` : ""}
        ${tenantPhone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${ltrBdi(escapeHtml(tenantPhone))}</p>` : ""}
        ${tenantEmail ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${ltrBdi(escapeHtml(tenantEmail))}</p>` : ""}
      </div>
      <div style="text-align: ${endAlign};">
        <h2 style="margin: 0 0 8px 0; font-size: 32px; color: #c9a227;">${escapeHtml(labels.invoice)}</h2>
        <p style="margin: 4px 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${ltrBdi(`#${escapeHtml(invoice.invoice_number)}`)}</p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.issueDate)}: ${ltrBdi(escapeHtml(formatStandardDate(invoice.issue_date)))}</p>
        ${invoice.due_date ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.dueDate)}: ${ltrBdi(escapeHtml(formatStandardDate(invoice.due_date)))}</p>` : ""}
      </div>
    </div>`;

  // ─── Bill-To ────────────────────────────────────────────────────────────
  const billToBlock = `
    <div data-block="bill-to" style="margin-bottom: 24px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign}; break-inside: avoid;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.billTo)}</p>
      <p style="margin: 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${autoBdi(escapeHtml(invoice.client_name || ""))}</p>
    </div>`;

  // ─── Items header (column labels) glued to first item-group ─────────────
  const itemsHeader = `
    <div data-block="items-header" data-block-glue-next style="display: grid; grid-template-columns: 1fr 100px 120px 120px; padding: 12px; background: #1e3a5f; color: white; font-weight: 600; break-inside: avoid;">
      <div style="text-align: ${startAlign};">${escapeHtml(labels.description)}</div>
      <div style="text-align: center;">${escapeHtml(labels.quantity)}</div>
      <div style="text-align: ${endAlign};">${escapeHtml(labels.unitPrice)}</div>
      <div style="text-align: ${endAlign};">${escapeHtml(labels.total)}</div>
    </div>`;

  // ─── One `<div data-block="item-group">` per horse/client-level group ──
  const renderGroupHeadingText = (group: (typeof presentation.groups)[number]): string => {
    if (group.kind === "client_level") return escapeHtml(labels.clientLevelCharges);
    const parts = formatHorseHeadingParts(group, lang, {
      horseGroupLabel: labels.horseGroupLabel,
      unassignedHorseLabel: labels.unassignedHorse,
    });
    const label = escapeHtml(parts.label);
    const primary = autoBdi(escapeHtml(parts.primary));
    if (!parts.secondary) return `${label}: ${primary}`;
    const secondaryInner = `(${escapeHtml(parts.secondary)})`;
    const secondaryIsolated = isAr ? ltrBdi(secondaryInner) : rtlBdi(secondaryInner);
    return `${label}: ${primary} <span style="color:#6b7280;font-weight:500;font-size:11px;">${secondaryIsolated}</span>`;
  };

  const renderItemRow = (item: (typeof presentation.groups)[number]["items"][number]): string => {
    const chip = item.isPackage
      ? `<span style="display:inline-block;background:#eef2ff;color:#3730a3;font-size:10px;padding:1px 6px;border-radius:4px;margin-inline-end:6px;letter-spacing:0.5px;">${escapeHtml(labels.packageChip)}</span>`
      : "";
    const serviceLine = item.serviceLabel
      ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${autoBdi(escapeHtml(item.serviceLabel))}</div>`
      : "";
    const includedRow =
      item.isPackage && item.children.length > 0
        ? `
        <div style="grid-column: 1 / -1; padding: 4px 12px; color:#6b7280; font-size:11px; letter-spacing:0.4px; text-align: ${startAlign}; padding-inline-start: 32px;">${escapeHtml(labels.included)}</div>` +
          item.children
            .map(
              (c) => `
        <div style="grid-column: 1 / -1; padding: 6px 12px; padding-inline-start: 32px; color:#6b7280; font-size:12px; text-align: ${startAlign};">↳ ${autoBdi(escapeHtml(c.name))} ${ltrBdi(`× ${c.quantity}`)}</div>`,
            )
            .join("")
        : "";
    return `
      <div data-block="item" style="display: grid; grid-template-columns: 1fr 100px 120px 120px; border-bottom: 1px solid #e5e7eb; break-inside: avoid;">
        <div style="padding: 12px; text-align: ${startAlign};">${chip}${autoBdi(escapeHtml(item.description))}${serviceLine}</div>
        <div style="padding: 12px; text-align: center;">${ltrBdi(String(item.quantity))}</div>
        <div style="padding: 12px; text-align: ${endAlign};">${ltrBdi(formatCurrency(item.unit_price))}</div>
        <div style="padding: 12px; text-align: ${endAlign};">${ltrBdi(formatCurrency(item.total_price))}</div>
        ${includedRow}
      </div>`;
  };

  const itemGroups = presentation.groups
    .map((group) => {
      const headingHtml = renderGroupHeadingText(group);
      const itemsHtml = group.items.map(renderItemRow).join("");
      return `
      <div data-block="item-group" style="margin-bottom: 4px;">
        <div data-block-heading style="padding: 12px 8px 8px 8px; border-bottom: 2px solid #1e3a5f; background: #f9fafb; font-size: 12px; letter-spacing: 0.5px; color: #1e3a5f; font-weight: 700; text-align: ${startAlign};"><span data-continuation-label>${headingHtml}</span></div>
        ${itemsHtml}
      </div>`;
    })
    .join("");

  // ─── Totals ─────────────────────────────────────────────────────────────
  const totalsBlock = `
    <div data-block="totals" style="display: flex; justify-content: ${isAr ? "flex-start" : "flex-end"}; margin-top: 24px; break-inside: avoid;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">${escapeHtml(labels.subtotal)}</span>
          <span style="color: #1e3a5f; font-weight: 500;">${ltrBdi(formatCurrency(invoice.subtotal))}</span>
        </div>
        ${
          invoice.tax_amount > 0
            ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280;">${escapeHtml(labels.tax)}</span><span style="color: #1e3a5f; font-weight: 500;">${ltrBdi(formatCurrency(invoice.tax_amount))}</span></div>`
            : ""
        }
        ${
          invoice.discount_amount > 0
            ? `<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280;">${escapeHtml(labels.discount)}</span><span style="color: #22c55e; font-weight: 500;">${ltrBdi(`-${formatCurrency(invoice.discount_amount)}`)}</span></div>`
            : ""
        }
        <div style="display: flex; justify-content: space-between; padding: 16px; background: #f9fafb; margin-top: 8px; border-radius: 8px;">
          <span style="font-size: 18px; font-weight: bold; color: #1e3a5f;">${escapeHtml(labels.total)}</span>
          <span style="font-size: 18px; font-weight: bold; color: #c9a227;">${ltrBdi(formatCurrency(invoice.total_amount))}</span>
        </div>
      </div>
    </div>`;

  // ─── Payment summary (Status + Paid + Outstanding) ──────────────────────
  const paymentStatusText = paymentSummary
    ? paymentSummary.status === "paid"
      ? labels.statusPaid
      : paymentSummary.status === "partial"
        ? labels.statusPartial
        : labels.statusUnpaid
    : null;
  const statusColor = paymentSummary?.status === "paid"
    ? "#16a34a"
    : paymentSummary?.status === "partial"
      ? "#c9a227"
      : "#dc2626";

  const paymentSummaryBlock = paymentSummary
    ? `
    <div data-block="payment-summary" style="margin-top: 24px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign}; break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.paymentStatusLabel)}</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${statusColor};">${escapeHtml(paymentStatusText || "")}</p>
        </div>
        <div style="text-align: ${endAlign};">
          <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: ${isAr ? "flex-start" : "flex-end"};">
            <div>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.paidToDate)}</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(paymentSummary.paidAmount))}</p>
            </div>
            <div>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.outstanding)}</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${paymentSummary.outstandingAmount > 0.01 ? "#dc2626" : "#16a34a"};">${ltrBdi(formatCurrency(paymentSummary.outstandingAmount))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>`
    : "";

  // ─── Payment history: flat renderer (legacy fallback) ───────────────────
  const flatHistoryBlock =
    paymentSummary && includePaymentHistory && paymentSummary.payments.length > 0 && !paymentSummary.sessions?.length
      ? `
    <div data-block="payment-history-heading" data-block-glue-next style="margin-top: 24px; break-inside: avoid;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e3a5f; text-align: ${startAlign};">${escapeHtml(labels.paymentHistoryHeading)}</h3>
    </div>
    <div data-block="payment-session" style="break-inside: avoid;">
      <div data-block-heading style="display:none;"></div>
      ${paymentSummary.payments
        .map((p) => {
          const methodKey = p.payment_method || "";
          const methodLabel = labels.methodLabels[methodKey] || methodKey || "—";
          const effDate = p.effective_date ? formatStandardDate(p.effective_date) : "—";
          const recAt = p.created_at ? formatStandardDateTime(p.created_at) : "—";
          return `
      <div data-block="session-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; break-inside: avoid;">
        <div style="text-align: ${startAlign};">${autoBdi(escapeHtml(methodLabel))}</div>
        <div style="text-align: ${startAlign};">${ltrBdi(escapeHtml(effDate))}</div>
        <div style="text-align: ${startAlign};">${ltrBdi(escapeHtml(recAt))}</div>
        <div style="text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(p.amount))}</div>
      </div>`;
        })
        .join("")}
    </div>`
      : "";

  // ─── Payment history: session-grouped renderer ──────────────────────────
  const sessionBlocks =
    paymentSummary && includePaymentHistory && paymentSummary.sessions?.length && labels.pdfPaymentSession
      ? (() => {
          const sessLabels = labels.pdfPaymentSession!;
          const historyHeadingBlock = `
    <div data-block="payment-history-heading" data-block-glue-next style="margin-top: 24px; break-inside: avoid;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e3a5f; text-align: ${startAlign};">${escapeHtml(labels.paymentHistoryHeading)}</h3>
    </div>`;
          const sessions = paymentSummary.sessions
            .map((sess, idx) => {
              const heading = sess.sessionId
                ? `${sessLabels.sessionLabel} #${idx + 1}`
                : sessLabels.historicalLabel;
              const dateLine = sess.effectiveDate
                ? ltrBdi(escapeHtml(formatStandardDate(sess.effectiveDate)))
                : "";
              const totalLine = `${escapeHtml(sessLabels.sessionTotal)}: ${ltrBdi(formatCurrency(sess.totalAmount))}`;
              const methodsRows = sess.tenders
                .map((t) => {
                  const methodLabel = labels.methodLabels[t.payment_method || ""] || t.payment_method || "—";
                  return `
        <div data-block="session-row" style="display: grid; grid-template-columns: 1fr auto; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; break-inside: avoid;">
          <div style="text-align: ${startAlign};">${autoBdi(escapeHtml(methodLabel))}</div>
          <div style="text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(t.amount))}</div>
        </div>`;
                })
                .join("");
              const hasDistribution =
                sess.horseAllocations.length > 0 || sess.clientLevelAmount > 0.005;
              const distRows = hasDistribution
                ? sess.horseAllocations
                    .map(
                      (h) => `
        <div data-block="session-row" style="display: grid; grid-template-columns: 1fr auto; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; break-inside: avoid;">
          <div style="text-align: ${startAlign};">${autoBdi(escapeHtml(isAr && h.horseNameAr ? h.horseNameAr : h.horseName))}</div>
          <div style="text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(h.amount))}</div>
        </div>`,
                    )
                    .join("") +
                  (sess.clientLevelAmount > 0.005
                    ? `
        <div data-block="session-row" style="display: grid; grid-template-columns: 1fr auto; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; break-inside: avoid;">
          <div style="text-align: ${startAlign}; color:#6b7280;">${escapeHtml(sessLabels.clientLevelLabel)}</div>
          <div style="text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(sess.clientLevelAmount))}</div>
        </div>`
                    : "")
                : "";
              return `
    <div data-block="payment-session" style="margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;">
      <div data-block-heading style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span data-continuation-label style="font-weight: 700; color: #1e3a5f; font-size: 13px;">${escapeHtml(heading)}${dateLine ? ` · ${dateLine}` : ""}</span>
        <span style="font-family: monospace; color: #1e3a5f; font-weight: 700;">${totalLine}</span>
      </div>
      <div data-block="session-subheading" style="margin: 6px 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 700; letter-spacing: 0.4px; text-align: ${startAlign};">${escapeHtml(sessLabels.methodsHeading)}</div>
      ${methodsRows}
      ${
        hasDistribution
          ? `<div data-block="session-subheading" style="margin: 10px 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 700; letter-spacing: 0.4px; text-align: ${startAlign};">${escapeHtml(sessLabels.distributionHeading)}</div>${distRows}`
          : ""
      }
    </div>`;
            })
            .join("");
          return historyHeadingBlock + sessions;
        })()
      : "";

  const paymentHistoryBlocks = sessionBlocks || flatHistoryBlock;

  // ─── Notes ──────────────────────────────────────────────────────────────
  const notesBlock = invoice.notes
    ? `
    <div data-block="notes" style="margin-top: 32px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign}; break-inside: avoid;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.notes)}</p>
      <p style="margin: 0; color: #374151; white-space: pre-wrap;">${autoBdi(escapeHtml(invoice.notes))}</p>
    </div>`
    : "";

  // ─── Thank-you footer ───────────────────────────────────────────────────
  const thankYouBlock = `
    <div data-block="footer-thankyou" style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px; break-inside: avoid;">
      <p style="margin: 0;">${escapeHtml(labels.thankYou)}</p>
    </div>`;

  return `<div class="pdf-body" data-lang="${lang}">${
    headerBlock + billToBlock + itemsHeader + itemGroups + totalsBlock +
    paymentSummaryBlock + paymentHistoryBlocks + notesBlock + thankYouBlock
  }</div>`;
};

/** Exported for unit tests — pure HTML fragment builder. */
export const __createInvoiceHTMLForTest = createInvoiceHTML;

// ────────────────────────────────────────────────────────────────────────────
// Font-ready capture contract (unchanged from prior slice).
// ────────────────────────────────────────────────────────────────────────────

export async function waitForInvoicePdfFonts(lang: string): Promise<void> {
  const isAr = lang === "ar";
  const fonts = (typeof document !== "undefined" ? (document as Document).fonts : undefined) as
    | FontFaceSet
    | undefined;
  if (!fonts) return;
  await fonts.ready;
  const face = isAr ? '"IBM Plex Sans Arabic"' : '"IBM Plex Sans"';
  const weights = ["400", "500", "600", "700"];
  const sampleText = isAr ? "فاتورة" : "Invoice";
  const loads = weights.map((w) =>
    fonts.load(`${w} 16px ${face}`, sampleText).catch(() => undefined),
  );
  const results = await Promise.all(loads);
  if (isAr) {
    const anyLoaded = results.some((r) => Array.isArray(r) && r.length > 0);
    if (!anyLoaded) {
      throw new Error(
        "IBM Plex Sans Arabic could not be loaded before PDF capture; refusing to generate a malformed Arabic PDF.",
      );
    }
  }
  if (typeof requestAnimationFrame === "function") {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Shared page-container construction — used by both Print and Download.
// ────────────────────────────────────────────────────────────────────────────

const PAGE_STYLE = (isAr: boolean) => {
  const fontStack = isAr
    ? `'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif`
    : `'IBM Plex Sans', Arial, sans-serif`;
  return `
    .pdf-page {
      position: relative;
      width: ${PAGE_WIDTH_MM}mm;
      height: ${PAGE_HEIGHT_MM}mm;
      padding: ${PAGE_PADDING_MM}mm ${PAGE_PADDING_MM}mm ${PAGE_PADDING_MM + FOOTER_STRIP_MM}mm ${PAGE_PADDING_MM}mm;
      box-sizing: border-box;
      background: white;
      font-family: ${fontStack};
      overflow: hidden;
    }
    .pdf-page + .pdf-page { page-break-before: always; break-before: page; }
    .pdf-page-footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: ${(FOOTER_STRIP_MM - 4) / 2}mm;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
      font-family: ${fontStack};
    }
    @media print {
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .pdf-page { margin: 0; }
    }
  `;
};

/**
 * Mount the invoice HTML off-screen, paginate its `[data-block]` children
 * into `.pdf-page` containers, and return the outer host along with the
 * ordered array of page elements. Caller is responsible for removing the
 * host from the document once rasterization or printing has completed.
 */
const mountAndPaginate = async (
  options: GeneratePDFOptions,
): Promise<{ host: HTMLElement; pages: HTMLElement[] }> => {
  const isAr = options.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const host = document.createElement("div");
  host.setAttribute("lang", options.lang);
  host.setAttribute("dir", dir);
  host.style.position = "absolute";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.width = `${PAGE_WIDTH_MM}mm`;

  // Include page CSS so the offscreen container has real dimensions.
  const styleEl = document.createElement("style");
  styleEl.textContent = PAGE_STYLE(isAr);
  host.appendChild(styleEl);

  // The invisible measurement body — same width as a page's content area.
  const measurementBody = document.createElement("div");
  measurementBody.style.width = `${PAGE_WIDTH_MM - PAGE_PADDING_MM * 2}mm`;
  measurementBody.style.padding = "0";
  measurementBody.innerHTML = DOMPurify.sanitize(createInvoiceHTML(options), {
    ADD_TAGS: ["style", "bdi"],
    ADD_ATTR: ["data-block", "data-block-heading", "data-block-glue-next", "data-continuation-label", "data-page-footer", "dir", "lang", "style"],
  });
  host.appendChild(measurementBody);
  document.body.appendChild(host);

  await waitForInvoicePdfFonts(options.lang);

  const bodyEl = measurementBody.querySelector<HTMLElement>(".pdf-body");
  if (!bodyEl) {
    throw new Error("Invoice PDF body missing — createInvoiceHTML did not emit .pdf-body");
  }

  const pageBlockGroups = paginateIntoPages(bodyEl, {
    usablePx: USABLE_HEIGHT_PX,
    continuationSuffix: options.labels.continuationSuffix,
  });

  // Remove the measurement body — we now materialize .pdf-page containers.
  measurementBody.remove();

  const pages: HTMLElement[] = pageBlockGroups.map((blocks) => {
    const page = document.createElement("div");
    page.className = "pdf-page";
    page.setAttribute("dir", dir);
    page.setAttribute("lang", options.lang);
    const body = document.createElement("div");
    body.className = "pdf-page-body";
    blocks.forEach((b) => body.appendChild(b));
    page.appendChild(body);
    const footer = document.createElement("div");
    footer.className = "pdf-page-footer";
    footer.setAttribute("data-page-footer", "");
    page.appendChild(footer);
    host.appendChild(page);
    return page;
  });

  applyPageNumberFooters(pages, options.labels.pageOf);
  return { host, pages };
};

// ────────────────────────────────────────────────────────────────────────────
// Download PDF path.
// ────────────────────────────────────────────────────────────────────────────

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<jsPDF> {
  const { host, pages } = await mountAndPaginate(options);
  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setProperties({
      title: buildInvoicePdfTitle(options.lang, options.invoice.invoice_number),
      subject: options.labels.invoice,
    });

    for (let i = 0; i < pages.length; i += 1) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        PAGE_WIDTH_MM,
        PAGE_HEIGHT_MM,
      );
    }
    return pdf;
  } finally {
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

export async function downloadInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const pdf = await generateInvoicePDF(options);
  pdf.save(buildInvoicePdfFilename(options.lang, options.invoice.invoice_number));
}

// ────────────────────────────────────────────────────────────────────────────
// Print path — same paginator, HTML-native reflow with fixed-height pages.
// ────────────────────────────────────────────────────────────────────────────

export async function printInvoice(options: GeneratePDFOptions): Promise<void> {
  const isAr = options.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontHref =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";
  const title = buildInvoicePdfTitle(options.lang, options.invoice.invoice_number);

  const { host, pages } = await mountAndPaginate(options);
  const pagesHtml = pages.map((p) => p.outerHTML).join("");
  // Clean up the offscreen host in the parent window immediately.
  if (host.parentNode) host.parentNode.removeChild(host);

  const win = window.open("", "_blank");
  if (!win) {
    await downloadInvoicePDF(options);
    return;
  }

  const doc = win.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="${options.lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontHref}">
<style>${PAGE_STYLE(isAr)}</style>
</head>
<body>${pagesHtml}</body>
</html>`);
  doc.close();
  try {
    doc.title = title;
  } catch {
    /* noop */
  }

  const winFonts = (doc as Document).fonts as FontFaceSet | undefined;
  if (winFonts) {
    try {
      await winFonts.ready;
      await Promise.all([
        winFonts.load(`600 16px "${isAr ? "IBM Plex Sans Arabic" : "IBM Plex Sans"}"`).catch(() => undefined),
        winFonts.load(`400 14px "${isAr ? "IBM Plex Sans Arabic" : "IBM Plex Sans"}"`).catch(() => undefined),
      ]);
    } catch {
      /* proceed with fallback */
    }
  }

  await new Promise<void>((resolve) => {
    if (typeof win.requestAnimationFrame === "function") {
      win.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 50);
    }
  });

  try {
    win.focus();
    win.print();
  } catch {
    /* user can trigger print manually */
  }
}
