import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DOMPurify from "dompurify";
import { formatStandardDate } from "@/lib/displayHelpers";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import {
  buildInvoicePresentation,
  formatHorseHeadingParts,
  type RawInvoiceItemForPresentation,
} from "@/lib/finance/invoicePresentation";

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
}

const escapeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createInvoiceHTML = (options: GeneratePDFOptions): string => {
  const { invoice, items, tenantName, tenantAddress, tenantPhone, tenantEmail, lang, labels } =
    options;

  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontStack = isAr
    ? `'IBM Plex Sans Arabic', 'Tahoma', 'Arial', sans-serif`
    : `'IBM Plex Sans', 'Arial', sans-serif`;
  // Logical alignment for text columns; numeric columns keep visual side.
  const startAlign = isAr ? "right" : "left";
  const endAlign = isAr ? "left" : "right";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "SAR",
    }).format(amount);
  };

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
    const primary = escapeHtml(parts.primary);
    const label = escapeHtml(parts.label);
    if (!parts.secondary) return `${label}: ${primary}`;
    const secondary = escapeHtml(parts.secondary);
    return `${label}: ${primary} <span style="color:#6b7280;font-weight:500;font-size:11px;">(${secondary})</span>`;
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
        ${escapeHtml(item.description)}
        ${item.serviceLabel ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${escapeHtml(item.serviceLabel)}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign};" dir="ltr">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: ${endAlign};" dir="ltr">${formatCurrency(item.total_price)}</td>
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
      <td style="padding: 6px 12px; padding-inline-start: 32px; border-bottom: 1px solid #f3f4f6; color:#6b7280; font-size:12px; text-align: ${startAlign};">↳ ${escapeHtml(c.name)} × ${c.quantity}</td>
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
          <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1e3a5f;">${escapeHtml(tenantName || "")}</h1>
          ${tenantAddress ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(tenantAddress)}</p>` : ""}
          ${tenantPhone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(tenantPhone)}</p>` : ""}
          ${tenantEmail ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(tenantEmail)}</p>` : ""}
        </div>`;

  const invoiceMetaBlock = `
        <div style="text-align: ${endAlign};">
          <h2 style="margin: 0 0 8px 0; font-size: 32px; color: #c9a227;">${escapeHtml(labels.invoice)}</h2>
          <p style="margin: 4px 0; font-size: 16px; color: #1e3a5f; font-weight: bold;" dir="ltr">#${escapeHtml(invoice.invoice_number)}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.issueDate)}: <span dir="ltr">${escapeHtml(formatStandardDate(invoice.issue_date))}</span></p>
          ${invoice.due_date ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${escapeHtml(labels.dueDate)}: <span dir="ltr">${escapeHtml(formatStandardDate(invoice.due_date))}</span></p>` : ""}
        </div>`;

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
        <p style="margin: 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${escapeHtml(invoice.client_name || "")}</p>
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
            <span style="color: #1e3a5f; font-weight: 500;" dir="ltr">${formatCurrency(invoice.subtotal)}</span>
          </div>
          ${
            invoice.tax_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${escapeHtml(labels.tax)}</span>
            <span style="color: #1e3a5f; font-weight: 500;" dir="ltr">${formatCurrency(invoice.tax_amount)}</span>
          </div>
          `
              : ""
          }
          ${
            invoice.discount_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">${escapeHtml(labels.discount)}</span>
            <span style="color: #22c55e; font-weight: 500;" dir="ltr">-${formatCurrency(invoice.discount_amount)}</span>
          </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; padding: 16px; background: #f9fafb; margin-top: 8px; border-radius: 8px;">
            <span style="font-size: 18px; font-weight: bold; color: #1e3a5f;">${escapeHtml(labels.total)}</span>
            <span style="font-size: 18px; font-weight: bold; color: #c9a227;" dir="ltr">${formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      ${
        invoice.notes
          ? `
      <!-- Notes -->
      <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: ${startAlign};">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.4px;">${escapeHtml(labels.notes)}</p>
        <p style="margin: 0; color: #374151; white-space: pre-wrap;">${escapeHtml(invoice.notes)}</p>
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

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<jsPDF> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.innerHTML = DOMPurify.sanitize(createInvoiceHTML(options), { ADD_TAGS: ["style"] });
  document.body.appendChild(container);

  try {
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

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);

    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const pdf = await generateInvoicePDF(options);
  pdf.save(`Invoice-${options.invoice.invoice_number}.pdf`);
}

export async function printInvoice(options: GeneratePDFOptions): Promise<void> {
  const pdf = await generateInvoicePDF(options);
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}
