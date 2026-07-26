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

/**
 * Phase N+1A refinement — strict localized labels bundle. Both call sites
 * (InvoiceDetailsSheet + InvoicesList) MUST supply the complete contract so
 * Arabic output never falls back to hardcoded English literals.
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
  // Payment disclosure block (Phase N+3 Slice 1)
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
  /** Optional session-grouped disclosure labels (Phase N+3 Slice 2.1). */
  pdfPaymentSession?: {
    sessionLabel: string;
    methodsHeading: string;
    distributionHeading: string;
    horseColumn: string;
    clientLevelLabel: string;
    historicalLabel: string;
    sessionTotal: string;
  };
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
// Phase N+1A closure — pure, testable filename + title builders.
// ────────────────────────────────────────────────────────────────────────────

const FILENAME_INVALID_CHARS = /[/\\:*?"<>|\u0000-\u001F]/g;

/**
 * Sanitize a fragment for use inside a filename. Preserves Arabic Unicode,
 * Latin letters, digits, hyphens, and single spaces. Replaces reserved
 * characters and collapses whitespace.
 */
export const sanitizeFilenameFragment = (raw: string): string =>
  String(raw ?? "")
    .replace(FILENAME_INVALID_CHARS, "-")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Localized invoice PDF filename builder.
 *   ar + "INV-0986" → "فاتورة INV-0986.pdf"
 *   en + "INV-0986" → "Invoice INV-0986.pdf"
 * Missing/blank invoice number falls back to a localized "Draft" — never a
 * UUID or internal id.
 */
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

/** PDF metadata + print-window title (no .pdf extension). */
export const buildInvoicePdfTitle = (
  lang: string,
  invoiceNumber: string | null | undefined,
): string => buildInvoicePdfFilename(lang, invoiceNumber).replace(/\.pdf$/, "");

// ────────────────────────────────────────────────────────────────────────────
// HTML template
// ────────────────────────────────────────────────────────────────────────────

const createInvoiceHTML = (options: GeneratePDFOptions): string => {
  const {
    invoice, items, tenantName, tenantAddress, tenantPhone, tenantEmail, lang, labels,
    paymentSummary, includePaymentHistory,
  } = options;

  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontStack = isAr
    ? `'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif`
    : `'IBM Plex Sans', Arial, sans-serif`;
  // Logical alignment for text columns; numeric columns keep visual side.
  const startAlign = isAr ? "right" : "left";
  const endAlign = isAr ? "left" : "right";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "SAR",
    }).format(amount);
  };

  // Isolated LTR fragment (for invoice number, dates, currency, English name
  // inside Arabic heading). Uses <bdi> + explicit dir + unicode-bidi: isolate
  // so browser bidi does not migrate parentheses or reorder digits.
  const ltrBdi = (inner: string) =>
    `<bdi dir="ltr" style="unicode-bidi:isolate;">${inner}</bdi>`;
  const rtlBdi = (inner: string) =>
    `<bdi dir="rtl" style="unicode-bidi:isolate;">${inner}</bdi>`;
  // Automatic direction for user/entity text (customer, description, horse
  // primary name, service labels): the browser picks LTR/RTL from the strong
  // characters in the content.
  const autoBdi = (inner: string) =>
    `<bdi dir="auto" style="unicode-bidi:isolate;">${inner}</bdi>`;

  const presentation = buildInvoicePresentation(
    items as unknown as RawInvoiceItemForPresentation[],
    { lang, clientLevelLabel: labels.clientLevelCharges },
  );

  const renderGroupHeading = (
    group: (typeof presentation.groups)[number],
  ): string => {
    if (group.kind === "client_level") return escapeHtml(labels.clientLevelCharges);
    const parts = formatHorseHeadingParts(group, lang, {
      horseGroupLabel: labels.horseGroupLabel,
      unassignedHorseLabel: labels.unassignedHorse,
    });
    const label = escapeHtml(parts.label);
    const primary = autoBdi(escapeHtml(parts.primary));
    if (!parts.secondary) return `${label}: ${primary}`;
    // Wrap the ENTIRE secondary fragment INCLUDING parentheses in an isolated
    // opposite-direction bdi so the parens sit on the correct visual sides.
    const secondaryInner = `(${escapeHtml(parts.secondary)})`;
    const secondaryIsolated = isAr ? ltrBdi(secondaryInner) : rtlBdi(secondaryInner);
    return `${label}: ${primary} <span style="color:#6b7280;font-weight:500;font-size:11px;">${secondaryIsolated}</span>`;
  };

  const itemsRows = presentation.groups
    .map((group) => {
      const heading = renderGroupHeading(group);
      const headerRow = `
    <tr>
      <td colspan="4" style="padding: 14px 8px 6px 8px; border-bottom: 2px solid #1e3a5f; background: #f9fafb; font-size: 12px; letter-spacing: 0.5px; color: #1e3a5f; font-weight: 700; text-align: ${startAlign};">
        ${heading}
      </td>
    </tr>`;
      const itemRows = group.items
        .map((item) => {
          const parent = `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">
        ${item.isPackage ? `<span style="display:inline-block;background:#eef2ff;color:#3730a3;font-size:10px;padding:1px 6px;border-radius:4px;margin-inline-end:6px;letter-spacing:0.5px;">${escapeHtml(labels.packageChip)}</span>` : ''}
        ${autoBdi(escapeHtml(item.description))}
        ${item.serviceLabel ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${autoBdi(escapeHtml(item.serviceLabel))}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ltrBdi(String(item.quantity))}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign};">${ltrBdi(formatCurrency(item.unit_price))}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign};">${ltrBdi(formatCurrency(item.total_price))}</td>
    </tr>`;
          const childRows =
            item.isPackage && item.children.length > 0
              ? `
    <tr>
      <td colspan="4" style="padding: 4px 12px; color:#6b7280; font-size:11px; letter-spacing:0.4px; text-align: ${startAlign}; padding-inline-start: 32px;">${escapeHtml(labels.included)}</td>
    </tr>` +
                item.children
                  .map(
                    (c) => `
    <tr>
      <td style="padding: 6px 12px; padding-inline-start: 32px; border-bottom: 1px solid #f3f4f6; color:#6b7280; font-size:12px; text-align: ${startAlign};">↳ ${autoBdi(escapeHtml(c.name))} ${ltrBdi(`× ${c.quantity}`)}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #f3f4f6;"></td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #f3f4f6;"></td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #f3f4f6;"></td>
    </tr>`,
                  )
                  .join("")
              : "";
          return parent + childRows;
        })
        .join("");
      return headerRow + itemRows;
    })
    .join("");

  const tenantHeader = `
        <div style="text-align: ${startAlign};">
          <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1e3a5f;">${autoBdi(escapeHtml(tenantName || ""))}</h1>
          ${tenantAddress ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${autoBdi(escapeHtml(tenantAddress))}</p>` : ""}
          ${tenantPhone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${ltrBdi(escapeHtml(tenantPhone))}</p>` : ""}
          ${tenantEmail ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${ltrBdi(escapeHtml(tenantEmail))}</p>` : ""}
        </div>`;

  const invoiceMetaBlock = `
        <div style="text-align: ${endAlign};">
          <h2 style="margin: 0 0 8px 0; font-size: 32px; color: #c9a227;">${escapeHtml(labels.invoice)}</h2>
          <p style="margin: 4px 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${ltrBdi(`#${escapeHtml(invoice.invoice_number)}`)}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.issueDate)}: ${ltrBdi(escapeHtml(formatStandardDate(invoice.issue_date)))}</p>
          ${invoice.due_date ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.dueDate)}: ${ltrBdi(escapeHtml(formatStandardDate(invoice.due_date)))}</p>` : ""}
        </div>`;

  // ─── Payment disclosure blocks (Phase N+3 Slice 1) ──────────────────────
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
      <div style="margin-top: 24px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign};">
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

  const renderFlatHistory = (): string =>
    paymentSummary && paymentSummary.payments.length > 0
      ? `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e3a5f;">
              <th style="padding: 8px 10px; text-align: ${startAlign}; color: white; font-weight: 600;">${escapeHtml(labels.colMethod)}</th>
              <th style="padding: 8px 10px; text-align: ${startAlign}; color: white; font-weight: 600;">${escapeHtml(labels.colEffectiveDate)}</th>
              <th style="padding: 8px 10px; text-align: ${startAlign}; color: white; font-weight: 600;">${escapeHtml(labels.colRecordedAt)}</th>
              <th style="padding: 8px 10px; text-align: ${endAlign}; color: white; font-weight: 600;">${escapeHtml(labels.colAmount)}</th>
            </tr>
          </thead>
          <tbody>
            ${paymentSummary.payments
              .map((p) => {
                const methodKey = p.payment_method || "";
                const methodLabel = labels.methodLabels[methodKey] || methodKey || "—";
                const effDate = p.effective_date ? formatStandardDate(p.effective_date) : "—";
                const recAt = p.created_at ? formatStandardDateTime(p.created_at) : "—";
                return `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">${autoBdi(escapeHtml(methodLabel))}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">${ltrBdi(escapeHtml(effDate))}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">${ltrBdi(escapeHtml(recAt))}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(p.amount))}</td>
            </tr>`;
              })
              .join("")}
          </tbody>
        </table>`
      : "";

  // Session-grouped renderer — used only when the fetcher produced a
  // `sessions` array (Phase N+3 Slice 2.1). Each session block shows its
  // tender methods and, when persisted, the horse/client-level distribution.
  const renderSessionGroupedHistory = (): string => {
    if (!paymentSummary?.sessions?.length) return "";
    const sessLabels = labels.pdfPaymentSession;
    if (!sessLabels) return renderFlatHistory();
    return paymentSummary.sessions
      .map((sess, idx) => {
        const heading = sess.sessionId
          ? `${sessLabels.sessionLabel} #${idx + 1}`
          : sessLabels.historicalLabel;
        const dateLine = sess.effectiveDate
          ? ltrBdi(escapeHtml(formatStandardDate(sess.effectiveDate)))
          : "";
        const methodsRows = sess.tenders
          .map((t) => {
            const methodLabel = labels.methodLabels[t.payment_method || ""] || t.payment_method || "—";
            return `
            <tr>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">${autoBdi(escapeHtml(methodLabel))}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(t.amount))}</td>
            </tr>`;
          })
          .join("");
        const hasDistribution =
          sess.horseAllocations.length > 0 || sess.clientLevelAmount > 0.005;
        const distributionRows = hasDistribution
          ? sess.horseAllocations
              .map(
                (h) => `
            <tr>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign};">${autoBdi(escapeHtml(isAr && h.horseNameAr ? h.horseNameAr : h.horseName))}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(h.amount))}</td>
            </tr>`,
              )
              .join("") +
            (sess.clientLevelAmount > 0.005
              ? `
            <tr>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${startAlign}; color:#6b7280;">${escapeHtml(sessLabels.clientLevelLabel)}</td>
              <td style="padding: 6px 10px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign}; font-weight: 600; color: #1e3a5f;">${ltrBdi(formatCurrency(sess.clientLevelAmount))}</td>
            </tr>`
              : "")
          : "";
        return `
        <div style="margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #1e3a5f; font-size: 13px;">${escapeHtml(heading)}${dateLine ? ` · ${dateLine}` : ""}</span>
            <span style="font-family: monospace; color: #1e3a5f; font-weight: 700;">${escapeHtml(sessLabels.sessionTotal)}: ${ltrBdi(formatCurrency(sess.totalAmount))}</span>
          </div>
          <div style="display: grid; grid-template-columns: ${hasDistribution ? "1fr 1fr" : "1fr"}; gap: 12px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 700; letter-spacing: 0.4px; text-align: ${startAlign};">${escapeHtml(sessLabels.methodsHeading)}</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tbody>${methodsRows}</tbody>
              </table>
            </div>
            ${
              hasDistribution
                ? `<div>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 700; letter-spacing: 0.4px; text-align: ${startAlign};">${escapeHtml(sessLabels.distributionHeading)}</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr>
                    <th style="padding: 4px 10px; text-align: ${startAlign}; font-size: 10px; color: #6b7280; text-transform: uppercase;">${escapeHtml(sessLabels.horseColumn)}</th>
                    <th style="padding: 4px 10px; text-align: ${endAlign}; font-size: 10px; color: #6b7280; text-transform: uppercase;">${escapeHtml(labels.colAmount)}</th>
                  </tr>
                </thead>
                <tbody>${distributionRows}</tbody>
              </table>
            </div>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");
  };

  const paymentHistoryBlock =
    paymentSummary && includePaymentHistory && paymentSummary.payments.length > 0
      ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e3a5f; text-align: ${startAlign};">${escapeHtml(labels.paymentHistoryHeading)}</h3>
        ${paymentSummary.sessions?.length ? renderSessionGroupedHistory() : renderFlatHistory()}
      </div>`
      : "";

  return `
    <div lang="${lang}" dir="${dir}" style="font-family: ${fontStack}; padding: 40px; max-width: 800px; margin: 0 auto; background: white; text-align: ${startAlign};">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px; align-items: flex-start; gap: 24px;">
        ${tenantHeader}
        ${invoiceMetaBlock}
      </div>

      <!-- Bill To -->
      <div style="margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.billTo)}</p>
        <p style="margin: 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${autoBdi(escapeHtml(invoice.client_name || ""))}</p>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #1e3a5f;">
            <th style="padding: 12px; text-align: ${startAlign}; color: white; font-weight: 600;">${escapeHtml(labels.description)}</th>
            <th style="padding: 12px; text-align: center; color: white; font-weight: 600; width: 100px;">${escapeHtml(labels.quantity)}</th>
            <th style="padding: 12px; text-align: ${endAlign}; color: white; font-weight: 600; width: 120px;">${escapeHtml(labels.unitPrice)}</th>
            <th style="padding: 12px; text-align: ${endAlign}; color: white; font-weight: 600; width: 120px;">${escapeHtml(labels.total)}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display: flex; justify-content: ${isAr ? "flex-start" : "flex-end"};">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${escapeHtml(labels.subtotal)}</span>
            <span style="color: #1e3a5f; font-weight: 500;">${ltrBdi(formatCurrency(invoice.subtotal))}</span>
          </div>
          ${
            invoice.tax_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${escapeHtml(labels.tax)}</span>
            <span style="color: #1e3a5f; font-weight: 500;">${ltrBdi(formatCurrency(invoice.tax_amount))}</span>
          </div>
          `
              : ""
          }
          ${
            invoice.discount_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${escapeHtml(labels.discount)}</span>
            <span style="color: #22c55e; font-weight: 500;">${ltrBdi(`-${formatCurrency(invoice.discount_amount)}`)}</span>
          </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; padding: 16px; background: #f9fafb; margin-top: 8px; border-radius: 8px;">
            <span style="font-size: 18px; font-weight: bold; color: #1e3a5f;">${escapeHtml(labels.total)}</span>
            <span style="font-size: 18px; font-weight: bold; color: #c9a227;">${ltrBdi(formatCurrency(invoice.total_amount))}</span>
          </div>
        </div>
      </div>

      ${paymentSummaryBlock}
      ${paymentHistoryBlock}


      ${
        invoice.notes
          ? `
      <!-- Notes -->
      <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.notes)}</p>
        <p style="margin: 0; color: #374151; white-space: pre-wrap;">${autoBdi(escapeHtml(invoice.notes))}</p>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">${escapeHtml(labels.thankYou)}</p>
      </div>
    </div>
  `;
};

/** Exported for unit tests — pure HTML fragment builder. */
export const __createInvoiceHTMLForTest = createInvoiceHTML;

// ────────────────────────────────────────────────────────────────────────────
// Font-ready capture contract
// ────────────────────────────────────────────────────────────────────────────

/**
 * Wait for the fonts required by the invoice HTML to be actually loaded
 * before html2canvas rasterizes the offscreen container. Guarantees Arabic
 * shaping is applied by the real "IBM Plex Sans Arabic" face instead of a
 * partially-loaded fallback.
 *
 * Throws when Arabic fonts cannot be established — rather than silently
 * producing a malformed PDF, the caller surfaces a normal error.
 */
export async function waitForInvoicePdfFonts(lang: string): Promise<void> {
  const isAr = lang === "ar";
  const fonts = (typeof document !== "undefined" ? (document as Document).fonts : undefined) as
    | FontFaceSet
    | undefined;

  if (!fonts) {
    // No FontFaceSet API — nothing to gate. Older browsers ship without it
    // but our supported matrix always has it; do not throw for absent API.
    return;
  }

  // 1. Global font readiness
  await fonts.ready;

  // 2. Explicitly request the weights actually used by the invoice template.
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

  // 3. Give the browser one paint frame to apply the loaded faces before
  //    html2canvas walks the DOM.
  if (typeof requestAnimationFrame === "function") {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<jsPDF> {
  const container = document.createElement("div");
  container.setAttribute("lang", options.lang);
  container.setAttribute("dir", options.lang === "ar" ? "rtl" : "ltr");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.innerHTML = DOMPurify.sanitize(createInvoiceHTML(options), { ADD_TAGS: ["style"] });
  document.body.appendChild(container);

  try {
    // Gate capture on the actual font being ready — see waitForInvoicePdfFonts.
    await waitForInvoicePdfFonts(options.lang);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Localized PDF metadata title — drives browser viewer + "Save as PDF"
    // filename when the user prints from the built-in viewer.
    pdf.setProperties({
      title: buildInvoicePdfTitle(options.lang, options.invoice.invoice_number),
      subject: options.labels.invoice,
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);

    return pdf;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export async function downloadInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const pdf = await generateInvoicePDF(options);
  pdf.save(buildInvoicePdfFilename(options.lang, options.invoice.invoice_number));
}

/**
 * Print path — same createInvoiceHTML output rendered inside a fresh
 * same-origin popup with a localized <title>. Using a real HTML print window
 * (instead of jsPDF's Blob viewer) means:
 *   • the browser tab, print dialog header, and "Save as PDF" default name
 *     all come from the localized title (`فاتورة INV-0986` / `Invoice INV-0986`)
 *     — never a Blob UUID;
 *   • Arabic shaping uses the live browser font stack directly, not a raster.
 */
export async function printInvoice(options: GeneratePDFOptions): Promise<void> {
  const isAr = options.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontHref =
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";
  const title = buildInvoicePdfTitle(options.lang, options.invoice.invoice_number);
  const bodyHtml = DOMPurify.sanitize(createInvoiceHTML(options), { ADD_TAGS: ["style"] });

  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked — fall back to the direct download so the user still
    // gets a localized, correctly-named PDF.
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
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${isAr ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" : "'IBM Plex Sans', Arial, sans-serif"}; }
  @media print { @page { size: A4; margin: 0; } }
</style>
</head>
<body>${bodyHtml}</body>
</html>`);
  doc.close();
  // Belt-and-braces: keep the localized title even if the browser resets it
  // after doc.write on some engines.
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
      /* proceed; the popup will still print with the available fallback */
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
