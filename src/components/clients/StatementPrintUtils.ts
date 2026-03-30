import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

export interface StatementPrintData {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  entries: StatementEntry[];
  enrichedDescriptions?: Map<string, string>;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  /** Client-wide outstanding (only present when scoped) */
  clientWideOutstanding?: number;
  /** Scope context: horse names or "All Horses" */
  scopeHorses?: string;
  /** Scope context: category label or "All Categories" */
  scopeCategory?: string;
  /** Whether the view is filtered/scoped */
  isScoped?: boolean;
  isRTL?: boolean;
  lang?: string;
}

function formatDateForPrint(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd-MM-yyyy');
}

function formatTimeForPrint(dateStr: string, lang: string = 'en'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const base = format(d, 'dd-MM-yyyy hh:mm');
  const hours = d.getHours();
  if (lang === 'ar') {
    return `${base} ${hours < 12 ? 'ص' : 'م'}`;
  }
  return `${base} ${hours < 12 ? 'AM' : 'PM'}`;
}

function getLabels(isRTL?: boolean) {
  if (isRTL) {
    return {
      title: "كشف الحساب",
      date: "التاريخ",
      description: "الوصف",
      debit: "المبلغ المطلوب",
      credit: "المبلغ المسدد",
      balance: "الإجمالي بعد الحركة",
      totalDebit: "إجمالي المبلغ المطلوب",
      totalCredit: "إجمالي المبلغ المسدد",
      closingBalance: "الرصيد الختامي",
      scopedDebit: "الفواتير (مفلتر)",
      scopedCredit: "المسدد (مفلتر)",
      scopedBalance: "المستحق (مفلتر)",
      clientWide: "إجمالي رصيد العميل",
      horses: "الخيول",
      category: "التصنيف",
    };
  }
  return {
    title: "Account Statement",
    date: "Date",
    description: "Description",
    debit: "Amount Due",
    credit: "Amount Paid",
    balance: "Balance After",
    totalDebit: "Total Amount Due",
    totalCredit: "Total Amount Paid",
    closingBalance: "Closing Balance",
    scopedDebit: "Invoices (Filtered)",
    scopedCredit: "Paid (Filtered)",
    scopedBalance: "Due (Filtered)",
    clientWide: "Total Client Balance",
    horses: "Horses",
    category: "Category",
  };
}

/**
 * Open a clean print window with the statement content.
 * Includes scope context and dual totals when filtered.
 */
export function printStatement(data: StatementPrintData) {
  const dir = data.isRTL ? "rtl" : "ltr";
  const textAlign = data.isRTL ? "right" : "left";
  const lang = data.lang || (data.isRTL ? 'ar' : 'en');
  const labels = getLabels(data.isRTL);

  const rows = data.entries
    .map((e) => {
      const desc = data.enrichedDescriptions?.get(e.id) || e.description || "-";
      const descHtml = desc.includes(" | ")
        ? desc.split(" | ").map((part, i) => i === 0 ? `<strong>${part}</strong>` : `<span style="color:#666;font-size:12px">${part}</span>`).join("<br>")
        : desc;
      return `
    <tr>
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap;vertical-align:top" dir="ltr">${formatDateForPrint(e.date)}</td>
      <td style="padding:6px 8px;text-align:${data.isRTL ? "right" : "left"};vertical-align:top">${descHtml}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;vertical-align:top" dir="ltr">${e.debit > 0 ? formatCurrency(e.debit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;vertical-align:top" dir="ltr">${e.credit > 0 ? formatCurrency(e.credit) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;font-weight:600;vertical-align:top" dir="ltr">${formatCurrency(e.balance)}</td>
    </tr>`;
    })
    .join("");

  // Scope context meta line
  const metaParts: string[] = [data.clientName];
  if (data.scopeHorses) metaParts.push(`${labels.horses}: ${data.scopeHorses}`);
  if (data.scopeCategory) metaParts.push(`${labels.category}: ${data.scopeCategory}`);
  const metaLine = metaParts.join(" &nbsp;|&nbsp; ");

  // Summary cards
  const debitLabel = data.isScoped ? labels.scopedDebit : labels.totalDebit;
  const creditLabel = data.isScoped ? labels.scopedCredit : labels.totalCredit;
  const balanceLabel = data.isScoped ? labels.scopedBalance : labels.closingBalance;

  let clientWideSummaryHtml = "";
  if (data.isScoped && data.clientWideOutstanding !== undefined) {
    clientWideSummaryHtml = `
  <div class="summary-card" style="border:2px dashed #ccc">
    <div class="label">${labels.clientWide}</div>
    <div class="value" dir="ltr">${formatCurrency(data.clientWideOutstanding)}</div>
  </div>`;
  }

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${labels.title} - ${data.clientName}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 20px; color: #1a1a1a; direction: ${dir}; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 6px; }
  .date-range { color: #666; font-size: 12px; margin-bottom: 16px; }
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
<h1>${labels.title}</h1>
<div class="meta">${metaLine}</div>
<div class="date-range"><span dir="ltr">${formatDateForPrint(data.dateFrom)} → ${formatDateForPrint(data.dateTo)}</span></div>

<div class="summary">
  <div class="summary-card">
    <div class="label">${debitLabel}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalDebits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${creditLabel}</div>
    <div class="value" dir="ltr">${formatCurrency(data.totalCredits)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${balanceLabel}</div>
    <div class="value" dir="ltr">${formatCurrency(data.closingBalance)}</div>
  </div>
  ${clientWideSummaryHtml}
</div>

<table>
  <thead>
    <tr>
      <th>${labels.date}</th>
      <th>${labels.description}</th>
      <th style="text-align:center">${labels.debit}</th>
      <th style="text-align:center">${labels.credit}</th>
      <th style="text-align:center">${labels.balance}</th>
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
  const lang = data.lang || (data.isRTL ? 'ar' : 'en');
  const labels = getLabels(data.isRTL);
  const headers = [labels.date, labels.description, labels.debit, labels.credit, labels.balance];
  const rows = data.entries.map((e) => [
    formatDateForPrint(e.date),
    `"${(data.enrichedDescriptions?.get(e.id) || e.description || "").replace(/"/g, '""')}"`,
    e.debit > 0 ? e.debit.toFixed(2) : "",
    e.credit > 0 ? e.credit.toFixed(2) : "",
    e.balance.toFixed(2),
  ]);

  const balanceLabel = data.isScoped ? labels.scopedBalance : labels.closingBalance;
  rows.push([]);
  rows.push(["", `"${balanceLabel}"`, data.totalDebits.toFixed(2), data.totalCredits.toFixed(2), data.closingBalance.toFixed(2)]);

  if (data.isScoped && data.clientWideOutstanding !== undefined) {
    rows.push(["", `"${labels.clientWide}"`, "", "", data.clientWideOutstanding.toFixed(2)]);
  }

  const csv = [headers.join(","), ...rows.map((r) => (r as string[]).join(","))].join("\n");
  const BOM = "\uFEFF";
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
 */
export function exportPDF(data: StatementPrintData) {
  printStatement(data);
}

/**
 * Generic ledger print function (reusable for Ledger tab + Payments tab)
 */
export function printLedgerEntries(data: {
  title: string;
  entries: Array<{
    id: string;
    date: string;
    entry_type: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isRTL?: boolean;
  lang?: string;
}) {
  const dir = data.isRTL ? "rtl" : "ltr";
  const textAlign = data.isRTL ? "right" : "left";
  const lang = data.lang || (data.isRTL ? 'ar' : 'en');
  const labels = getLabels(data.isRTL);

  const rows = data.entries
    .map(
      (e) => `
    <tr>
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap" dir="ltr">${formatTimeForPrint(e.date, lang)}</td>
      <td style="padding:6px 8px;text-align:center"><span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:11px">${e.entry_type}</span></td>
      <td style="padding:6px 8px;text-align:${data.isRTL ? "right" : "left"}">${e.description || "-"}</td>
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
<title>${data.title}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 20px; color: #1a1a1a; direction: ${dir}; }
  h1 { font-size: 20px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f0f0f0; padding: 8px; text-align: ${textAlign}; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  .footer { margin-top: 16px; font-size: 12px; color: #666; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${data.title}</h1>
<table>
  <thead>
    <tr>
      <th>${labels.date}</th>
      <th style="text-align:center">${data.isRTL ? "النوع" : "Type"}</th>
      <th>${labels.description}</th>
      <th style="text-align:center">${labels.debit}</th>
      <th style="text-align:center">${labels.credit}</th>
      <th style="text-align:center">${labels.balance}</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  ${labels.totalDebit}: ${formatCurrency(data.totalDebits)} &nbsp;|&nbsp;
  ${labels.totalCredit}: ${formatCurrency(data.totalCredits)}
</div>
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
 * Export ledger entries as CSV
 */
export function exportLedgerCSV(data: {
  filename: string;
  entries: Array<{
    date: string;
    entry_type: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  lang?: string;
  isRTL?: boolean;
}) {
  const lang = data.lang || 'en';
  const labels = getLabels(data.isRTL);
  const headers = [labels.date, data.isRTL ? "النوع" : "Type", labels.description, labels.debit, labels.credit, labels.balance];
  const rows = data.entries.map((e) => [
    formatTimeForPrint(e.date, lang),
    e.entry_type,
    `"${(e.description || "").replace(/"/g, '""')}"`,
    e.debit > 0 ? e.debit.toFixed(2) : "",
    e.credit > 0 ? e.credit.toFixed(2) : "",
    e.balance.toFixed(2),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = data.filename;
  a.click();
  URL.revokeObjectURL(url);
}
