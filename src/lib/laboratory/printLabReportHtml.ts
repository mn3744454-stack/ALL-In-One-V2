/**
 * L4-a-3c P5.2 — Customer Statement-style print generator for Laboratory reports.
 *
 * Replaces the failed current-document print approach (P5/P5.1) with a
 * self-contained print-window HTML document, mirroring the proven pattern in
 * `src/components/clients/StatementPrintUtils.ts` (`printStatement`).
 *
 * Design rules:
 *  - Open a new window with `window.open("", "_blank")`.
 *  - Write a complete HTML doc with inline `<style>` only — no Tailwind, no
 *    design tokens, no shadcn, no portals, no dialogs.
 *  - One compact `<table>` per analysis; document-style header + meta row.
 *  - `<html dir lang>` set once; numeric cells force `dir="ltr"`.
 *  - All interpolated strings are HTML-escaped to prevent XSS via DB-sourced
 *    horse / lab / sample identifiers and interpretation notes.
 *
 * Scope:
 *  - Does NOT touch backend, RPCs, RLS, schema, share/publish/result lifecycle.
 *  - Does NOT change PDF (`html2canvas` + `jsPDF`) handlers.
 *  - Does NOT modify `LabResultReportViewer`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Locale = "ar" | "en";

interface NormalRange {
  min?: number;
  max?: number;
  values?: string[];
}

interface TemplateField {
  id?: string;
  name?: string;
  name_ar?: string | null;
  type?: string;
  unit?: string | null;
  unit_ar?: string | null;
  options?: string[];
  group_id?: string | null;
  sort_order?: number;
}

interface TemplateGroup {
  id?: string;
  name?: string;
  name_ar?: string | null;
  sort_order?: number;
}

export interface LabPrintAnalysis {
  templateName?: string | null;
  templateNameAr?: string | null;
  flags?: string | null; // normal | abnormal | critical
  status?: string | null;
  interpretation?: unknown;
  resultData?: Record<string, unknown> | null;
  templateFields?: unknown; // JSON array of TemplateField
  templateNormalRanges?: unknown; // JSON record fieldId -> NormalRange
  templateGroups?: unknown; // JSON array of TemplateGroup
}

export interface LabPrintReport {
  labName?: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
  sampleId?: string | null;
  physicalSampleId?: string | null;
  collectionDate?: string | null; // ISO
  reportDate?: string | null; // ISO
  analyses: LabPrintAnalysis[];
}

export interface PrintLabReportOptions {
  lang: Locale;
  /**
   * Optional document title used both for the print dialog and the new
   * window's <title>. Defaults to localized "Lab Report - {horse}".
   */
  title?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function bilingual(en: string | null | undefined, ar: string | null | undefined, isRTL: boolean): string {
  const e = (en ?? "").trim();
  const a = (ar ?? "").trim();
  if (e && a) return isRTL ? `${a} (${e})` : `${e} (${a})`;
  return (isRTL ? a || e : e || a) || "";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).join(", ");
  if (typeof v === "object") {
    try {
      return Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => `${k}: ${formatValue(val)}`)
        .join(", ");
    } catch {
      return "—";
    }
  }
  return String(v);
}

function formatRange(r?: NormalRange): string {
  if (!r) return "—";
  if (Array.isArray(r.values) && r.values.length > 0) return r.values.join(", ");
  const hasMin = typeof r.min === "number";
  const hasMax = typeof r.max === "number";
  if (hasMin && hasMax) return `${r.min} – ${r.max}`;
  if (hasMin) return `≥ ${r.min}`;
  if (hasMax) return `≤ ${r.max}`;
  return "—";
}

function compareToRange(v: unknown, r?: NormalRange): "low" | "normal" | "high" | "neutral" {
  if (!r) return "neutral";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return "neutral";
  if (typeof r.min === "number" && n < r.min) return "low";
  if (typeof r.max === "number" && n > r.max) return "high";
  if (typeof r.min === "number" || typeof r.max === "number") return "normal";
  return "neutral";
}

function getLabels(isRTL: boolean) {
  if (isRTL) {
    return {
      labReport: "تقرير المختبر",
      horse: "الخيل",
      lab: "المختبر",
      sample: "العينة",
      collectionDate: "تاريخ الجمع",
      reportDate: "تاريخ التقرير",
      analyses: "التحاليل",
      parameter: "المعامل",
      value: "القيمة",
      unit: "الوحدة",
      reference: "المرجع",
      status: "الحالة",
      interpretation: "التفسير",
      summary: "ملخص",
      recommendations: "التوصيات",
      notes: "ملاحظات",
      flagNormal: "طبيعي",
      flagAbnormal: "غير طبيعي",
      flagCritical: "حرج",
      statusLow: "منخفض ↓",
      statusHigh: "مرتفع ↑",
      statusNormal: "طبيعي",
      statusNeutral: "—",
    };
  }
  return {
    labReport: "Lab Report",
    horse: "Horse",
    lab: "Lab",
    sample: "Sample",
    collectionDate: "Collection Date",
    reportDate: "Report Date",
    analyses: "Analyses",
    parameter: "Parameter",
    value: "Value",
    unit: "Unit",
    reference: "Reference",
    status: "Status",
    interpretation: "Interpretation",
    summary: "Summary",
    recommendations: "Recommendations",
    notes: "Notes",
    flagNormal: "Normal",
    flagAbnormal: "Abnormal",
    flagCritical: "Critical",
    statusLow: "Low ↓",
    statusHigh: "High ↑",
    statusNormal: "Normal",
    statusNeutral: "—",
  };
}

function flagText(
  flag: string | null | undefined,
  labels: ReturnType<typeof getLabels>
): { text: string; color: string } | null {
  if (!flag) return null;
  switch (flag) {
    case "normal":
      return { text: labels.flagNormal, color: "#15803d" };
    case "abnormal":
      return { text: labels.flagAbnormal, color: "#c2410c" };
    case "critical":
      return { text: labels.flagCritical, color: "#b91c1c" };
    default:
      return { text: flag, color: "#6b7280" };
  }
}

function statusText(
  cmp: "low" | "normal" | "high" | "neutral",
  labels: ReturnType<typeof getLabels>
): { text: string; color: string } {
  switch (cmp) {
    case "low":
      return { text: labels.statusLow, color: "#1d4ed8" };
    case "high":
      return { text: labels.statusHigh, color: "#b91c1c" };
    case "normal":
      return { text: labels.statusNormal, color: "#15803d" };
    default:
      return { text: labels.statusNeutral, color: "#6b7280" };
  }
}

// ---------------------------------------------------------------------------
// Interpretation renderer (mirrors InterpretationBody logic without React)
// ---------------------------------------------------------------------------

function renderInterpretationHtml(
  value: unknown,
  locale: Locale,
  labels: ReturnType<typeof getLabels>
): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return `<p class="interp-text">${escapeHtml(trimmed)}</p>`;
  }

  if (typeof value !== "object" || Array.isArray(value)) return "";
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return "";

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const notes = str(obj.notes);
  const notesEn = str(obj.notes_en);
  const notesAr = str(obj.notes_ar);
  const summary = str(obj.summary);
  const status = str(obj.status);
  const recs = Array.isArray(obj.recommendations)
    ? (obj.recommendations.filter(
        (r): r is string => typeof r === "string" && !!r.trim()
      ) as string[])
    : [];

  const localizedNotes =
    locale === "ar" ? notesAr || notesEn : notesEn || notesAr;
  const primaryNotes = notes || localizedNotes;

  const known = new Set([
    "notes",
    "notes_en",
    "notes_ar",
    "summary",
    "status",
    "recommendations",
  ]);
  const extra = Object.entries(obj).filter(
    ([k, v]) =>
      !known.has(k) &&
      (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  );

  const hasAny =
    !!summary ||
    !!primaryNotes ||
    !!status ||
    recs.length > 0 ||
    extra.length > 0;
  if (!hasAny) return "";

  const parts: string[] = [];
  if (summary) {
    parts.push(
      `<div class="interp-block"><div class="interp-label">${escapeHtml(labels.summary)}</div><div class="interp-text">${escapeHtml(summary)}</div></div>`
    );
  }
  if (primaryNotes) {
    parts.push(`<p class="interp-text">${escapeHtml(primaryNotes)}</p>`);
  }
  if (recs.length > 0) {
    parts.push(
      `<div class="interp-block"><div class="interp-label">${escapeHtml(labels.recommendations)}</div><ul class="interp-list">${recs.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>`
    );
  }
  if (status) {
    parts.push(
      `<div class="interp-block"><span class="interp-label">${escapeHtml(labels.status)}:</span> <span>${escapeHtml(status)}</span></div>`
    );
  }
  if (extra.length > 0) {
    parts.push(
      `<dl class="interp-extra">${extra
        .map(
          ([k, v]) =>
            `<dt>${escapeHtml(k.replace(/_/g, " "))}</dt><dd>${escapeHtml(String(v))}</dd>`
        )
        .join("")}</dl>`
    );
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Per-analysis table renderer
// ---------------------------------------------------------------------------

function renderAnalysisHtml(
  analysis: LabPrintAnalysis,
  index: number,
  total: number,
  locale: Locale,
  isRTL: boolean,
  labels: ReturnType<typeof getLabels>
): string {
  const title =
    bilingual(analysis.templateName, analysis.templateNameAr, isRTL) || "—";
  const flag = flagText(analysis.flags, labels);
  const fields = asArray<TemplateField>(analysis.templateFields);
  const ranges = asRecord(analysis.templateNormalRanges) as Record<string, NormalRange>;
  const groups = asArray<TemplateGroup>(analysis.templateGroups);
  const resultData = analysis.resultData ?? {};

  const sortedFields = [...fields].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  // Resolve value by id, then name, then case-insensitive
  const resolveValue = (f: TemplateField): unknown => {
    if (f.id && Object.prototype.hasOwnProperty.call(resultData, f.id)) {
      return resultData[f.id];
    }
    if (f.name && Object.prototype.hasOwnProperty.call(resultData, f.name)) {
      return resultData[f.name];
    }
    const lowered = f.name?.toLowerCase();
    if (lowered) {
      const match = Object.keys(resultData).find((k) => k.toLowerCase() === lowered);
      if (match) return resultData[match];
    }
    return undefined;
  };

  // Group buckets (mirror viewer behavior)
  const buckets: { group: TemplateGroup | null; fields: TemplateField[] }[] = [];
  if (groups.length > 0) {
    const sortedGroups = [...groups].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    for (const g of sortedGroups) {
      buckets.push({ group: g, fields: sortedFields.filter((f) => f.group_id === g.id) });
    }
    const ungrouped = sortedFields.filter(
      (f) => !f.group_id || !sortedGroups.some((g) => g.id === f.group_id)
    );
    if (ungrouped.length > 0) buckets.push({ group: null, fields: ungrouped });
  } else if (sortedFields.length > 0) {
    buckets.push({ group: null, fields: sortedFields });
  }

  const headerRow = `
    <thead>
      <tr>
        <th class="col-param">${escapeHtml(labels.parameter)}</th>
        <th class="col-value">${escapeHtml(labels.value)}</th>
        <th class="col-unit">${escapeHtml(labels.unit)}</th>
        <th class="col-ref">${escapeHtml(labels.reference)}</th>
        <th class="col-status">${escapeHtml(labels.status)}</th>
      </tr>
    </thead>`;

  let body = "";
  if (buckets.length === 0) {
    // Extra entries fallback when no template context
    const extras = Object.entries(resultData);
    if (extras.length > 0) {
      body =
        `<tbody>` +
        extras
          .map(
            ([k, v]) => `
            <tr>
              <td class="col-param">${escapeHtml(k.replace(/_/g, " "))}</td>
              <td class="col-value" dir="ltr">${escapeHtml(formatValue(v))}</td>
              <td class="col-unit">—</td>
              <td class="col-ref">—</td>
              <td class="col-status">—</td>
            </tr>`
          )
          .join("") +
        `</tbody>`;
    } else {
      body = `<tbody><tr><td colspan="5" class="empty">—</td></tr></tbody>`;
    }
  } else {
    body = buckets
      .map((bucket) => {
        const groupRow = bucket.group
          ? `<tr class="group-row"><td colspan="5">${escapeHtml(
              bilingual(bucket.group.name, bucket.group.name_ar, isRTL)
            )}</td></tr>`
          : "";
        const rows = bucket.fields
          .map((f) => {
            const v = resolveValue(f);
            const range = f.id ? ranges[f.id] : undefined;
            const cmp = compareToRange(v, range);
            const st = statusText(cmp, labels);
            const paramLabel = bilingual(f.name, f.name_ar, isRTL) || f.name || "—";
            const unit = isRTL ? f.unit_ar || f.unit : f.unit || f.unit_ar;
            return `
              <tr>
                <td class="col-param">${escapeHtml(paramLabel)}</td>
                <td class="col-value" dir="ltr">${escapeHtml(formatValue(v))}</td>
                <td class="col-unit" dir="ltr">${escapeHtml(unit || "—")}</td>
                <td class="col-ref" dir="ltr">${escapeHtml(formatRange(range))}</td>
                <td class="col-status" style="color:${st.color}">${escapeHtml(st.text)}</td>
              </tr>`;
          })
          .join("");
        return `<tbody>${groupRow}${rows}</tbody>`;
      })
      .join("");
  }

  const interpHtml = renderInterpretationHtml(analysis.interpretation, locale, labels);
  const interpBlock = interpHtml
    ? `<div class="interp"><div class="interp-title">${escapeHtml(labels.interpretation)}</div>${interpHtml}</div>`
    : "";

  const flagBadge = flag
    ? `<span class="flag" style="color:${flag.color};border-color:${flag.color}">${escapeHtml(flag.text)}</span>`
    : "";

  const numberLabel = total > 1 ? `${index + 1}. ` : "";

  return `
    <section class="analysis">
      <div class="analysis-head">
        <h2 class="analysis-title">${escapeHtml(numberLabel)}${escapeHtml(title)}</h2>
        ${flagBadge}
      </div>
      <table class="result-table">
        ${headerRow}
        ${body}
      </table>
      ${interpBlock}
    </section>`;
}

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

export function buildLabReportHtml(
  report: LabPrintReport,
  options: PrintLabReportOptions
): string {
  const locale: Locale = options.lang === "ar" ? "ar" : "en";
  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const labels = getLabels(isRTL);

  const horseDisplay = bilingual(report.horseName, report.horseNameAr, isRTL) || "—";
  const sampleDisplay = report.physicalSampleId || report.sampleId || "—";
  const reportDate = formatDate(report.reportDate || report.collectionDate);
  const collectionDate = formatDate(report.collectionDate);
  const analysesCount = report.analyses.length;

  const docTitle =
    options.title || `${labels.labReport} — ${horseDisplay}`;

  // Meta items: label + value (skipped when empty)
  const metaItems: Array<{ label: string; value: string; ltr?: boolean }> = [];
  metaItems.push({ label: labels.horse, value: horseDisplay });
  if (report.labName) metaItems.push({ label: labels.lab, value: report.labName });
  if (sampleDisplay !== "—") metaItems.push({ label: labels.sample, value: sampleDisplay, ltr: true });
  if (collectionDate !== "—") metaItems.push({ label: labels.collectionDate, value: collectionDate, ltr: true });
  if (reportDate !== "—") metaItems.push({ label: labels.reportDate, value: reportDate, ltr: true });
  metaItems.push({ label: labels.analyses, value: String(analysesCount), ltr: true });

  const metaHtml = metaItems
    .map(
      (m) => `
      <div class="meta-item">
        <div class="meta-label">${escapeHtml(m.label)}</div>
        <div class="meta-value"${m.ltr ? ' dir="ltr"' : ""}>${escapeHtml(m.value)}</div>
      </div>`
    )
    .join("");

  const analysesHtml = report.analyses
    .map((a, i) => renderAnalysisHtml(a, i, analysesCount, locale, isRTL, labels))
    .join("");

  const textAlign = isRTL ? "right" : "left";
  // Arabic-friendly font stack — system shaping covers AR text cleanly in
  // browser print without bundling a webfont.
  const fontStack = isRTL
    ? `"Segoe UI", "Tahoma", "Arial", "Noto Naskh Arabic", system-ui, sans-serif`
    : `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(docTitle)}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  *, *::before, *::after {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    box-sizing: border-box;
  }
  html, body { background: #fff; color: #111; }
  body {
    font-family: ${fontStack};
    direction: ${dir};
    margin: 16px;
    font-size: 12px;
    line-height: 1.4;
  }
  .doc-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #111;
    margin-bottom: 12px;
  }
  .doc-head .lab {
    font-size: 16px;
    font-weight: 700;
  }
  .doc-head .date {
    font-size: 11px;
    color: #444;
    white-space: nowrap;
  }
  h1.report-title {
    font-size: 18px;
    margin: 0 0 8px 0;
    font-weight: 700;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px 16px;
    border: 1px solid #ddd;
    padding: 8px 10px;
    margin-bottom: 14px;
    background: #fafafa;
  }
  .meta-item { min-width: 0; }
  .meta-label {
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .meta-value {
    font-size: 12px;
    color: #111;
    font-weight: 600;
    word-break: break-word;
  }
  .analysis {
    margin-bottom: 14px;
    break-inside: avoid-page;
    page-break-inside: avoid;
  }
  .analysis + .analysis { margin-top: 14px; }
  .analysis-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 6px;
    break-after: avoid;
    page-break-after: avoid;
  }
  .analysis-title {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
  }
  .flag {
    font-size: 11px;
    font-weight: 600;
    border: 1px solid currentColor;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
  }
  table.result-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    table-layout: fixed;
  }
  table.result-table thead { display: table-header-group; }
  table.result-table tfoot { display: table-footer-group; }
  table.result-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  table.result-table th,
  table.result-table td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    text-align: ${textAlign};
    vertical-align: top;
    word-break: break-word;
  }
  table.result-table th {
    background: #f0f0f0;
    font-weight: 700;
    font-size: 11px;
  }
  .col-param { width: 32%; }
  .col-value { width: 18%; }
  .col-unit  { width: 12%; }
  .col-ref   { width: 22%; }
  .col-status{ width: 16%; }
  .col-value, .col-unit, .col-ref { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; }
  .col-status { font-weight: 600; }
  tr.group-row td {
    background: #f7f7f7;
    font-weight: 700;
    font-size: 11px;
    border-top: 2px solid #ccc;
  }
  td.empty {
    text-align: center;
    color: #888;
    padding: 12px;
  }
  .interp {
    margin-top: 6px;
    padding: 6px 10px;
    border-${isRTL ? "right" : "left"}: 3px solid #999;
    background: #fafafa;
    font-size: 11px;
  }
  .interp-title {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 4px;
    color: #444;
  }
  .interp-block { margin: 4px 0; }
  .interp-label {
    font-size: 10px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
  }
  .interp-text {
    margin: 2px 0;
    white-space: pre-wrap;
  }
  .interp-list {
    margin: 2px 0;
    padding-${isRTL ? "right" : "left"}: 18px;
  }
  .interp-extra {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 8px;
    margin: 4px 0 0;
  }
  .interp-extra dt {
    font-size: 10px;
    color: #666;
    text-transform: capitalize;
  }
  .interp-extra dd { margin: 0; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <div class="doc-head">
    <div class="lab">${escapeHtml(report.labName || labels.labReport)}</div>
    <div class="date" dir="ltr">${escapeHtml(reportDate)}</div>
  </div>
  <h1 class="report-title">${escapeHtml(labels.labReport)} — ${escapeHtml(horseDisplay)}</h1>
  <div class="meta">${metaHtml}</div>
  ${analysesHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function printLabReport(
  report: LabPrintReport,
  options: PrintLabReportOptions
): void {
  if (typeof window === "undefined") return;
  const html = buildLabReportHtml(report, options);
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked — surface a console warning; callers may add toast UX.
    console.warn("[printLabReport] window.open returned null (popup blocked?)");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Same 400ms delay as printStatement to let layout settle before print().
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch (err) {
      console.warn("[printLabReport] print failed", err);
    }
  }, 400);
}
