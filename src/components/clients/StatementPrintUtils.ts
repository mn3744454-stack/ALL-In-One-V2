import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import type { StatementEntry } from "@/hooks/clients/useClientStatement";
import { classifyLedgerEntry, semanticClassLabel } from "@/lib/finance/statementSemantics";

/**
 * Escape user-controlled strings before interpolating into HTML written to a
 * print window. Prevents stored XSS via client names, descriptions, scope text,
 * and entry types sourced from the database.
 */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface StatementPrintData {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  entries: StatementEntry[];
  enrichedDescriptions?: Map<string, string>;
  /** Slice 2C — Overall/scoped in-range totals (sum of invoice debits in range). */
  totalDebits: number;
  totalCredits: number;
  /** 2QA-A · Finding 1 — Scoped outstanding CLAMPED to ≥ 0 (semantic resolver). */
  scopedOutstanding: number;
  /** 2QA-A · Finding 1 — Genuine scoped negative balance shown as Credit Balance in Scope. */
  scopedCreditBalance?: number;
  /** Slice 2C — Lifetime posted invoice debits (customer-wide). Present in scoped mode. */
  customerTotalInvoices?: number;
  /** Slice 2C — max(0, lifetime customer ledger balance). Present in scoped mode. */
  customerTotalOutstanding?: number;
  /** Slice 2C — Scope context */
  scopeHorses?: string;
  scopeCategory?: string;
  isScoped?: boolean;
  isRTL?: boolean;
  lang?: string;
  /** Slice 2C — Issuing tenant identity (mandatory on print/PDF/CSV). */
  issuerName?: string;
  issuerNameAr?: string | null;
  /** Slice 2C — First financial activity date (yyyy-MM-dd), if available. */
  firstActivityDate?: string | null;
}

function formatDateForPrint(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd-MM-yyyy');
}

function formatTimeForPrint(dateStr: string, _lang: string = 'en'): string {
  return formatStandardDateTime(dateStr);
}

function getLabels(isRTL?: boolean) {
  if (isRTL) {
    return {
      title: "كشف الحساب",
      date: "التاريخ",
      description: "الوصف",
      type: "النوع",
      debit: "المبلغ المطلوب",
      credit: "المبلغ المسدد",
      balance: "الإجمالي بعد الحركة",
      // Overall summary (3 cards)
      totalInvoices: "إجمالي الفواتير",
      totalPaid: "إجمالي المبلغ المسدد",
      totalOutstanding: "إجمالي المبلغ المستحق",
      // Scoped summary (5 cards)
      scopedInvoices: "إجمالي الفواتير ضمن النطاق",
      scopedPaid: "إجمالي المسدد ضمن النطاق",
      scopedOutstanding: "إجمالي المستحق ضمن النطاق",
      scopedCreditBalance: "رصيد دائن ضمن النطاق",
      customerTotalInvoices: "إجمالي فواتير العميل",
      customerTotalOutstanding: "إجمالي مستحقات العميل",
      horses: "الخيول",
      category: "التصنيف",
      from: "من",
      to: "إلى",
      issuedBy: "الجهة المُصدرة",
      firstActivity: "أول حركة مالية",
    };
  }
  return {
    title: "Account Statement",
    date: "Date",
    description: "Description",
    type: "Type",
    debit: "Amount Due",
    credit: "Amount Paid",
    balance: "Balance After",
    totalInvoices: "Total Invoices",
    totalPaid: "Total Paid",
    totalOutstanding: "Total Outstanding",
    scopedInvoices: "Invoices in Scope",
    scopedPaid: "Paid in Scope",
    scopedOutstanding: "Outstanding in Scope",
    scopedCreditBalance: "Credit Balance in Scope",
    customerTotalInvoices: "Customer Total Invoices",
    customerTotalOutstanding: "Customer Total Outstanding",
    horses: "Horses",
    category: "Category",
    from: "From",
    to: "To",
    issuedBy: "Issued by",
    firstActivity: "First Financial Activity",
  };
}

function issuerDisplayName(data: StatementPrintData): string {
  const isRTL = !!data.isRTL;
  if (isRTL) return data.issuerNameAr || data.issuerName || "";
  return data.issuerName || data.issuerNameAr || "";
}

/**
 * Open a clean print window with the statement content.
 * Slice 2C — includes issuer identity, 3-card overall or 5-card scoped summary,
 * and clearly separates the transaction running balance from Total Outstanding.
 */
export function printStatement(data: StatementPrintData) {
  const dir = data.isRTL ? "rtl" : "ltr";
  const textAlign = data.isRTL ? "right" : "left";
  const labels = getLabels(data.isRTL);
  const issuer = issuerDisplayName(data);

  const rows = data.entries
    .map((e) => {
      const desc = data.enrichedDescriptions?.get(e.id) || e.description || "-";
      const descHtml = desc.includes(" | ")
        ? desc.split(" | ").map((part, i) => i === 0 ? `<strong>${escapeHtml(part)}</strong>` : `<span style="color:#666;font-size:12px">${escapeHtml(part)}</span>`).join("<br>")
        : escapeHtml(desc);
      // 2QA-A · Finding 1 — Surface semantic classification as an inline pill
      // for non-standard entries (cancellation, reversal, adjustment).
      const sem = classifyLedgerEntry(e);
      const semPill = sem.semanticClass === "posted_invoice_debit" || sem.semanticClass === "real_payment"
        ? ""
        : `<div class="sem-pill sem-${sem.semanticClass}">${escapeHtml(semanticClassLabel(sem.semanticClass, !!data.isRTL))}</div>`;
      return `
    <tr>
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap;vertical-align:top" dir="ltr">${escapeHtml(formatDateForPrint(e.date))}</td>
      <td style="padding:6px 8px;text-align:${data.isRTL ? "right" : "left"};vertical-align:top">${descHtml}${semPill}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;vertical-align:top;color:#b91c1c" dir="ltr">${e.debit > 0 ? escapeHtml(formatCurrency(e.debit)) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;vertical-align:top;color:#047857" dir="ltr">${e.credit > 0 ? escapeHtml(formatCurrency(e.credit)) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;font-weight:600;vertical-align:top" dir="ltr">${escapeHtml(formatCurrency(e.balance))}</td>
    </tr>`;
    })
    .join("");

  const metaParts: string[] = [];
  if (data.scopeHorses) metaParts.push(`${escapeHtml(labels.horses)}: ${escapeHtml(data.scopeHorses)}`);
  if (data.scopeCategory) metaParts.push(`${escapeHtml(labels.category)}: ${escapeHtml(data.scopeCategory)}`);
  if (data.firstActivityDate) metaParts.push(`${escapeHtml(labels.firstActivity)}: ${escapeHtml(formatDateForPrint(data.firstActivityDate))}`);
  const metaLine = metaParts.join(" &nbsp;|&nbsp; ");

  // Slice 2C — Build summary cards conditionally.
  const cards: Array<{ label: string; value: number; dashed?: boolean }> = [];
  if (data.isScoped) {
    cards.push({ label: labels.scopedInvoices, value: data.totalDebits });
    cards.push({ label: labels.scopedPaid, value: data.totalCredits });
    cards.push({ label: labels.scopedOutstanding, value: data.scopedOutstanding });
    cards.push({ label: labels.customerTotalInvoices, value: data.customerTotalInvoices ?? 0, dashed: true });
    cards.push({ label: labels.customerTotalOutstanding, value: data.customerTotalOutstanding ?? 0, dashed: true });
  } else {
    cards.push({ label: labels.totalInvoices, value: data.totalDebits });
    cards.push({ label: labels.totalPaid, value: data.totalCredits });
    cards.push({ label: labels.totalOutstanding, value: Math.max(0, data.scopedOutstanding) });
  }

  const cardsHtml = cards.map((c) => `
    <div class="summary-card" style="${c.dashed ? 'border:2px dashed #ccc' : ''}">
      <div class="label">${escapeHtml(c.label)}</div>
      <div class="value" dir="ltr">${escapeHtml(formatCurrency(c.value))}</div>
    </div>`).join("");

  const issuerBlock = issuer ? `
  <div class="issuer">
    <div class="issuer-label">${escapeHtml(labels.issuedBy)}</div>
    <div class="issuer-name">${escapeHtml(issuer)}</div>
  </div>` : "";

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(labels.title)} - ${escapeHtml(data.clientName)}</title>
<style>
  /* 2QA-A · Finding 3 — force color/background preservation in Print/PDF. */
  html, body, .summary-card, .sem-pill, td, th {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body { font-family: system-ui, sans-serif; margin: 20px; color: #1a1a1a; direction: ${dir}; }
  .issuer { padding: 8px 0 12px; border-bottom: 1px solid #eee; margin-bottom: 12px; }
  .issuer-label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .issuer-name { font-size: 16px; font-weight: 700; margin-top: 2px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  .client { color: #333; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 6px; }
  .date-range { color: #666; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; min-width: 140px; }
  .summary-card .label { font-size: 12px; color: #666; }
  .summary-card .value { font-size: 18px; font-weight: 700; font-family: monospace; }
  .summary-card.tone-debt .value { color: #b91c1c; }
  .summary-card.tone-credit { background: #ecfdf5; }
  .summary-card.tone-credit .value { color: #047857; }
  .sem-pill { display:inline-block; margin-top:4px; padding:2px 8px; border-radius:9999px;
              font-size:10px; font-weight:600; background:#fef3c7; color:#92400e; }
  .sem-pill.sem-invoice_cancellation, .sem-pill.sem-invoice_reversal, .sem-pill.sem-invoice_debit_reversal {
    background:#fee2e2; color:#991b1b;
  }
  .sem-pill.sem-credit_note, .sem-pill.sem-payment_refund { background:#dbeafe; color:#1e40af; }
  .sem-pill.sem-accounting_adjustment { background:#e5e7eb; color:#374151; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f0f0f0; padding: 8px; text-align: ${textAlign}; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { border-bottom: 1px solid #eee; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
${issuerBlock}
<h1>${escapeHtml(labels.title)}</h1>
<div class="client">${escapeHtml(data.clientName)}</div>
${metaLine ? `<div class="meta">${metaLine}</div>` : ""}
<div class="date-range"><span dir="ltr">${escapeHtml(labels.from)}: ${escapeHtml(formatDateForPrint(data.dateFrom))} — ${escapeHtml(labels.to)}: ${escapeHtml(formatDateForPrint(data.dateTo))}</span></div>

<div class="summary">${cardsHtml}</div>

<table>
  <thead>
    <tr>
      <th>${escapeHtml(labels.date)}</th>
      <th>${escapeHtml(labels.description)}</th>
      <th style="text-align:center">${escapeHtml(labels.debit)}</th>
      <th style="text-align:center">${escapeHtml(labels.credit)}</th>
      <th style="text-align:center">${escapeHtml(labels.balance)}</th>
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
 * Slice 2C — CSV export with UTF-8 BOM, issuer metadata header, and parity
 * with the on-screen 3-card / 5-card summary.
 */
export function exportCSV(data: StatementPrintData) {
  const labels = getLabels(data.isRTL);
  const issuer = issuerDisplayName(data);

  const escapeCsv = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const metaRows: string[][] = [];
  if (issuer) metaRows.push([escapeCsv(labels.issuedBy), escapeCsv(issuer)]);
  metaRows.push([escapeCsv(labels.title), escapeCsv(data.clientName)]);
  metaRows.push([escapeCsv(labels.from), escapeCsv(formatDateForPrint(data.dateFrom)), escapeCsv(labels.to), escapeCsv(formatDateForPrint(data.dateTo))]);
  if (data.scopeHorses) metaRows.push([escapeCsv(labels.horses), escapeCsv(data.scopeHorses)]);
  if (data.scopeCategory) metaRows.push([escapeCsv(labels.category), escapeCsv(data.scopeCategory)]);
  if (data.firstActivityDate) metaRows.push([escapeCsv(labels.firstActivity), escapeCsv(formatDateForPrint(data.firstActivityDate))]);
  metaRows.push([]);

  const summaryRows: string[][] = [];
  if (data.isScoped) {
    summaryRows.push([escapeCsv(labels.scopedInvoices), escapeCsv(data.totalDebits.toFixed(2))]);
    summaryRows.push([escapeCsv(labels.scopedPaid), escapeCsv(data.totalCredits.toFixed(2))]);
    summaryRows.push([escapeCsv(labels.scopedOutstanding), escapeCsv(data.scopedOutstanding.toFixed(2))]);
    summaryRows.push([escapeCsv(labels.customerTotalInvoices), escapeCsv((data.customerTotalInvoices ?? 0).toFixed(2))]);
    summaryRows.push([escapeCsv(labels.customerTotalOutstanding), escapeCsv((data.customerTotalOutstanding ?? 0).toFixed(2))]);
  } else {
    summaryRows.push([escapeCsv(labels.totalInvoices), escapeCsv(data.totalDebits.toFixed(2))]);
    summaryRows.push([escapeCsv(labels.totalPaid), escapeCsv(data.totalCredits.toFixed(2))]);
    summaryRows.push([escapeCsv(labels.totalOutstanding), escapeCsv(Math.max(0, data.scopedOutstanding).toFixed(2))]);
  }
  summaryRows.push([]);

  const headers = [labels.date, labels.description, labels.debit, labels.credit, labels.balance].map(escapeCsv);
  const rows = data.entries.map((e) => [
    escapeCsv(formatDateForPrint(e.date)),
    escapeCsv(data.enrichedDescriptions?.get(e.id) || e.description || ""),
    escapeCsv(e.debit > 0 ? e.debit.toFixed(2) : ""),
    escapeCsv(e.credit > 0 ? e.credit.toFixed(2) : ""),
    escapeCsv(e.balance.toFixed(2)),
  ]);

  const lines = [
    ...metaRows.map((r) => r.join(",")),
    ...summaryRows.map((r) => r.join(",")),
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ];
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${data.clientName}-${data.dateFrom}-${data.dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** PDF via the safe print flow (unchanged). */
export function exportPDF(data: StatementPrintData) {
  printStatement(data);
}

/** Generic ledger print utility retained for other tabs (unchanged). */
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
      <td style="padding:6px 8px;font-family:monospace;white-space:nowrap" dir="ltr">${escapeHtml(formatTimeForPrint(e.date, lang))}</td>
      <td style="padding:6px 8px;text-align:center"><span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:11px">${escapeHtml(e.entry_type)}</span></td>
      <td style="padding:6px 8px;text-align:${data.isRTL ? "right" : "left"}">${escapeHtml(e.description || "-")}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.debit > 0 ? escapeHtml(formatCurrency(e.debit)) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace" dir="ltr">${e.credit > 0 ? escapeHtml(formatCurrency(e.credit)) : "-"}</td>
      <td style="padding:6px 8px;text-align:center;font-family:monospace;font-weight:600" dir="ltr">${escapeHtml(formatCurrency(e.balance))}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(data.title)}</title>
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
<h1>${escapeHtml(data.title)}</h1>
<table>
  <thead>
    <tr>
      <th>${escapeHtml(labels.date)}</th>
      <th style="text-align:center">${escapeHtml(data.isRTL ? "النوع" : "Type")}</th>
      <th>${escapeHtml(labels.description)}</th>
      <th style="text-align:center">${escapeHtml(labels.debit)}</th>
      <th style="text-align:center">${escapeHtml(labels.credit)}</th>
      <th style="text-align:center">${escapeHtml(labels.balance)}</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  ${escapeHtml(labels.totalInvoices)}: ${escapeHtml(formatCurrency(data.totalDebits))} &nbsp;|&nbsp;
  ${escapeHtml(labels.totalPaid)}: ${escapeHtml(formatCurrency(data.totalCredits))}
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
