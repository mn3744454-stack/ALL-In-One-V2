import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

interface StatementPrintData {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  entries: StatementEntry[];
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  isRTL?: boolean;
}

/**
 * Open a clean print window with just the statement content
 */
export function printStatement(data: StatementPrintData) {
  const dir = data.isRTL ? "rtl" : "ltr";
  const textAlign = data.isRTL ? "right" : "left";
  
  const rows = data.entries
    .map(
      (e) => `
    <tr>
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap" dir="ltr">${format(new Date(e.date), "yyyy-MM-dd HH:mm")}</td>
      <td style="padding:6px 8px">${e.description || "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.debit > 0 ? formatCurrency(e.debit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.credit > 0 ? formatCurrency(e.credit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;font-weight:600" dir="ltr">${formatCurrency(e.balance)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>Account Statement - ${data.clientName}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 20px; color: #1a1a1a; direction: ${dir}; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; min-width: 140px; }
  .summary-card .label { font-size: 12px; color: #666; }
  .summary-card .value { font-size: 18px; font-weight: 700; font-family: monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f0f0f0; padding: 8px; text-align: ${textAlign}; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${data.isRTL ? "كشف الحساب" : "Account Statement"}</h1>
<div class="meta">${data.clientName} &nbsp;|&nbsp; <span dir="ltr">${data.dateFrom} → ${data.dateTo}</span></div>

<div class="summary">
  <div class="summary-card">
    <div class="label">${data.isRTL ? "إجمالي المدين" : "Total Debits"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalDebits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${data.isRTL ? "إجمالي الدائن" : "Total Credits"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalCredits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${data.isRTL ? "الرصيد الختامي" : "Closing Balance"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.closingBalance)}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>${data.isRTL ? "التاريخ" : "Date"}</th>
      <th>${data.isRTL ? "الوصف" : "Description"}</th>
      <th style="text-align:center">${data.isRTL ? "مدين" : "Debit"}</th>
      <th style="text-align:center">${data.isRTL ? "دائن" : "Credit"}</th>
      <th style="text-align:center">${data.isRTL ? "الرصيد" : "Balance"}</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}

/**
 * Export statement as CSV
 */
export function exportCSV(data: StatementPrintData) {
  const headers = ["Date", "Description", "Debit", "Credit", "Balance"];
  const rows = data.entries.map((e) => [
    format(new Date(e.date), "yyyy-MM-dd HH:mm"),
    `"${(e.description || "").replace(/"/g, '""')}"`,
    e.debit > 0 ? e.debit.toFixed(2) : "",
    e.credit > 0 ? e.credit.toFixed(2) : "",
    e.balance.toFixed(2),
  ]);

  // Add summary row
  rows.push([]);
  rows.push(["", "Total", data.totalDebits.toFixed(2), data.totalCredits.toFixed(2), data.closingBalance.toFixed(2)]);

  const csv = [headers.join(","), ...rows.map((r) => (r as string[]).join(","))].join("\n");
  const BOM = "\uFEFF"; // For Excel Arabic support
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${data.clientName}-${data.dateFrom}-${data.dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export statement as PDF using print-to-PDF approach (supports Arabic)
 * Opens a clean print window; user can Save as PDF from browser print dialog.
 */
export function exportPDF(data: StatementPrintData) {
  // Reuse the same clean HTML as printStatement for Arabic support
  const dir = data.isRTL ? "rtl" : "ltr";
  const textAlign = data.isRTL ? "right" : "left";
  
  const rows = data.entries
    .map(
      (e) => `
    <tr>
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap" dir="ltr">${format(new Date(e.date), "yyyy-MM-dd HH:mm")}</td>
      <td style="padding:6px 8px">${e.description || "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.debit > 0 ? formatCurrency(e.debit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.credit > 0 ? formatCurrency(e.credit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;font-weight:600" dir="ltr">${formatCurrency(e.balance)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${data.isRTL ? "كشف الحساب" : "Account Statement"} - ${data.clientName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #1a1a1a; direction: ${dir}; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
  .note { background: #f0f8ff; border: 1px solid #d0e8ff; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #336; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; min-width: 140px; }
  .summary-card .label { font-size: 12px; color: #666; }
  .summary-card .value { font-size: 18px; font-weight: 700; font-family: monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f0f0f0; padding: 8px; text-align: ${textAlign}; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  @media print { body { margin: 0; } .note { display: none; } }
</style>
</head>
<body>
<h1>${data.isRTL ? "كشف الحساب" : "Account Statement"}</h1>
<div class="meta">${data.clientName} &nbsp;|&nbsp; <span dir="ltr">${data.isRTL ? `من ${data.dateFrom} إلى ${data.dateTo}` : `From ${data.dateFrom} To ${data.dateTo}`}</span></div>

<div class="note">${data.isRTL ? "لحفظ كملف PDF: اختر \"حفظ كـ PDF\" من نافذة الطباعة" : "To save as PDF: Choose \"Save as PDF\" in the print dialog"}</div>

<div class="summary">
  <div class="summary-card">
    <div class="label">${data.isRTL ? "إجمالي المدين" : "Total Debits"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalDebits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${data.isRTL ? "إجمالي الدائن" : "Total Credits"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalCredits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${data.isRTL ? "الرصيد الختامي" : "Closing Balance"}</div>
    <div class="value" dir="ltr">${formatCurrency(data.closingBalance)}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>${data.isRTL ? "التاريخ" : "Date"}</th>
      <th>${data.isRTL ? "الوصف" : "Description"}</th>
      <th style="text-align:center">${data.isRTL ? "مدين" : "Debit"}</th>
      <th style="text-align:center">${data.isRTL ? "دائن" : "Credit"}</th>
      <th style="text-align:center">${data.isRTL ? "الرصيد" : "Balance"}</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
