import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";

interface GeneratePDFOptions {
  invoice: Invoice;
  items: InvoiceItem[];
  tenantName?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  tenantEmail?: string;
}

const createInvoiceHTML = (options: GeneratePDFOptions): string => {
  const { invoice, items, tenantName, tenantAddress, tenantPhone, tenantEmail } = options;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency || "SAR",
    }).format(amount);
  };

  const itemsRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total_price)}</td>
    </tr>
  `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px; align-items: flex-start;">
        <div>
          <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #1e3a5f;">${tenantName || "Company Name"}</h1>
          ${tenantAddress ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${tenantAddress}</p>` : ""}
          ${tenantPhone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${tenantPhone}</p>` : ""}
          ${tenantEmail ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">${tenantEmail}</p>` : ""}
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0 0 8px 0; font-size: 32px; color: #c9a227; text-transform: uppercase;">Invoice</h2>
          <p style="margin: 4px 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">#${invoice.invoice_number}</p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">Date: ${format(new Date(invoice.issue_date), "MMMM d, yyyy")}</p>
          ${invoice.due_date ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;">Due: ${format(new Date(invoice.due_date), "MMMM d, yyyy")}</p>` : ""}
        </div>
      </div>

      <!-- Bill To -->
      <div style="margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Bill To</p>
        <p style="margin: 0; font-size: 16px; color: #1e3a5f; font-weight: bold;">${invoice.client_name || "Client Name"}</p>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #1e3a5f;">
            <th style="padding: 12px; text-align: left; color: white; font-weight: 600;">Description</th>
            <th style="padding: 12px; text-align: center; color: white; font-weight: 600; width: 100px;">Qty</th>
            <th style="padding: 12px; text-align: right; color: white; font-weight: 600; width: 120px;">Unit Price</th>
            <th style="padding: 12px; text-align: right; color: white; font-weight: 600; width: 120px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Subtotal</span>
            <span style="color: #1e3a5f; font-weight: 500;">${formatCurrency(invoice.subtotal)}</span>
          </div>
          ${
            invoice.tax_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Tax</span>
            <span style="color: #1e3a5f; font-weight: 500;">${formatCurrency(invoice.tax_amount)}</span>
          </div>
          `
              : ""
          }
          ${
            invoice.discount_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #6b7280;">Discount</span>
            <span style="color: #22c55e; font-weight: 500;">-${formatCurrency(invoice.discount_amount)}</span>
          </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; padding: 16px 0; background: #f9fafb; margin-top: 8px; border-radius: 8px; padding-left: 16px; padding-right: 16px;">
            <span style="font-size: 18px; font-weight: bold; color: #1e3a5f;">Total</span>
            <span style="font-size: 18px; font-weight: bold; color: #c9a227;">${formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      ${
        invoice.notes
          ? `
      <!-- Notes -->
      <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Notes</p>
        <p style="margin: 0; color: #374151; white-space: pre-wrap;">${invoice.notes}</p>
      </div>
      `
          : ""
      }

      <!-- Footer -->
      <div style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">Thank you for your business!</p>
      </div>
    </div>
  `;
};

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<jsPDF> {
  // Create a temporary div to render the invoice
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "210mm"; // A4 width
  container.innerHTML = createInvoiceHTML(options);
  document.body.appendChild(container);

  try {
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Create PDF
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
