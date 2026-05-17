import { CheckCircle2, AlertTriangle, XCircle, Minus, ArrowDown, ArrowUp, Building2, Calendar, FlaskConical, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatStandardDate } from "@/lib/displayHelpers";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { InterpretationBody, hasInterpretationContent } from "./InterpretationBody";

/**
 * L4-a-1 — Shared read-only Lab Result Report Viewer.
 *
 * Pure presentational. Does not fetch, mutate, call Supabase, or trigger
 * publish/share/print/PDF. Consumed first by `StableResultViewerDialog`.
 * Lab-side `ResultPreviewDialog` adoption is deferred to L4-a-2.
 */

type TemplateField = {
  id?: string;
  name?: string;
  name_ar?: string | null;
  type?: string;
  unit?: string | null;
  unit_ar?: string | null;
  options?: string[];
  group_id?: string | null;
  sort_order?: number;
};

type TemplateGroup = {
  id?: string;
  name?: string;
  name_ar?: string | null;
  sort_order?: number;
};

type NormalRange = {
  min?: number;
  max?: number;
  values?: string[];
};

export type LabReportVariant = "modern" | "classic" | "compact";

export interface LabResultReportViewerProps {
  // Identity
  templateName?: string | null;
  templateNameAr?: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
  labName?: string | null;
  physicalSampleId?: string | null;
  sampleId?: string | null;
  resultDate?: string | null;        // ISO
  collectionDate?: string | null;    // ISO
  status?: string | null;            // result lifecycle status
  flags?: string | null;             // normal|abnormal|critical
  interpretation?: unknown;          // free-form

  // Result + template context (template_* may be null)
  resultData?: Record<string, unknown> | null;
  templateFields?: unknown;          // Json from RPC
  templateNormalRanges?: unknown;    // Json from RPC
  templateGroups?: unknown;          // Json from RPC

  variant?: LabReportVariant;

  /**
   * Layout chrome.
   * - "full" (default): renders the full outer report header card (title, flag,
   *   horse/lab/sample/date metadata) followed by the body.
   * - "section": suppresses the outer header card and renders body only,
   *   intended for grouped reports where a single sample-level header already
   *   exists in the parent (see L4-a-2.2).
   */
  chrome?: "full" | "section";

  /** Optional compact label shown at the top of section-mode body. */
  sectionLabel?: string;
}

/** Best-effort bilingual label: AR-first in Arabic UI, EN-first in English UI. */
function bilingual(en: string | null | undefined, ar: string | null | undefined, isRTL: boolean): string {
  const e = (en ?? "").trim();
  const a = (ar ?? "").trim();
  if (e && a) return isRTL ? `${a} (${e})` : `${e} (${a})`;
  return (isRTL ? a || e : e || a) || "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "✓" : "✗";
  return String(value);
}

function compareToRange(value: unknown, range?: NormalRange): "low" | "normal" | "high" | "neutral" {
  if (!range) return "neutral";
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return "neutral";
  if (typeof range.min === "number" && n < range.min) return "low";
  if (typeof range.max === "number" && n > range.max) return "high";
  if (typeof range.min === "number" || typeof range.max === "number") return "normal";
  return "neutral";
}

function formatRange(range?: NormalRange): string {
  if (!range) return "—";
  if (Array.isArray(range.values) && range.values.length > 0) return range.values.join(", ");
  const hasMin = typeof range.min === "number";
  const hasMax = typeof range.max === "number";
  if (hasMin && hasMax) return `${range.min} – ${range.max}`;
  if (hasMin) return `≥ ${range.min}`;
  if (hasMax) return `≤ ${range.max}`;
  return "—";
}

function FlagIcon({ flag }: { flag: string | null | undefined }) {
  switch (flag) {
    case "normal":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "abnormal":
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case "critical":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
}

function StatusIcon({ status }: { status: "low" | "normal" | "high" | "neutral" }) {
  switch (status) {
    case "low":
      return <ArrowDown className="h-4 w-4 text-blue-600 inline-block" />;
    case "high":
      return <ArrowUp className="h-4 w-4 text-red-600 inline-block" />;
    case "normal":
      return <CheckCircle2 className="h-4 w-4 text-green-600 inline-block" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground inline-block" />;
  }
}

export function LabResultReportViewer(props: LabResultReportViewerProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();

  const fields = asArray<TemplateField>(props.templateFields);
  const groups = asArray<TemplateGroup>(props.templateGroups);
  const ranges = asRecord(props.templateNormalRanges) as Record<string, NormalRange>;
  const resultData = props.resultData ?? {};

  const sortedFields = [...fields].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  // Group fields by group_id when groups exist
  const groupBuckets: { group: TemplateGroup | null; fields: TemplateField[] }[] = [];
  if (groups.length > 0) {
    const sortedGroups = [...groups].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    for (const g of sortedGroups) {
      groupBuckets.push({
        group: g,
        fields: sortedFields.filter((f) => f.group_id === g.id),
      });
    }
    const ungrouped = sortedFields.filter(
      (f) => !f.group_id || !sortedGroups.some((g) => g.id === f.group_id)
    );
    if (ungrouped.length > 0) groupBuckets.push({ group: null, fields: ungrouped });
  } else if (sortedFields.length > 0) {
    groupBuckets.push({ group: null, fields: sortedFields });
  }

  // Resolve a value for a field by id, then by name (case-insensitive) fallback
  const resolveValue = (f: TemplateField): { value: unknown; usedKey: string | null } => {
    if (f.id && Object.prototype.hasOwnProperty.call(resultData, f.id)) {
      return { value: resultData[f.id], usedKey: f.id };
    }
    if (f.name && Object.prototype.hasOwnProperty.call(resultData, f.name)) {
      return { value: resultData[f.name], usedKey: f.name };
    }
    const lowered = f.name?.toLowerCase();
    if (lowered) {
      const match = Object.keys(resultData).find((k) => k.toLowerCase() === lowered);
      if (match) return { value: resultData[match], usedKey: match };
    }
    return { value: undefined, usedKey: null };
  };

  // Determine which result_data keys remain after mapping → "extra values"
  const consumedKeys = new Set<string>();
  for (const f of sortedFields) {
    const { usedKey } = resolveValue(f);
    if (usedKey) consumedKeys.add(usedKey);
  }
  const extraEntries = Object.entries(resultData).filter(([k]) => !consumedKeys.has(k));

  const hasTemplateContext = sortedFields.length > 0;

  const reportTitle = bilingual(props.templateName, props.templateNameAr, isRTL)
    || t("laboratory.results.unknownTest");
  const horseLabel = bilingual(props.horseName, props.horseNameAr, isRTL);
  const showInterpretation = hasInterpretationContent(props.interpretation);

  const chrome = props.chrome ?? "full";

  return (
    <div className="space-y-6">
      {/* Report header (full chrome only) */}
      {chrome === "full" && (
        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                <FlaskConical className="h-3.5 w-3.5" />
                {t("laboratory.preview.testResults")}
              </div>
              <h2 className="mt-1 text-lg sm:text-xl font-semibold break-words">{reportTitle}</h2>
            </div>
            {props.flags && (
              <Badge
                variant="outline"
                className={
                  props.flags === "critical"
                    ? "border-red-300 text-red-700 dark:text-red-300"
                    : props.flags === "abnormal"
                      ? "border-orange-300 text-orange-700 dark:text-orange-300"
                      : "border-green-300 text-green-700 dark:text-green-300"
                }
              >
                <FlagIcon flag={props.flags} />
                <span className="ms-1 capitalize">{props.flags}</span>
              </Badge>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {horseLabel && (
              <MetaItem
                label={t("laboratory.report.horse")}
                value={horseLabel}
              />
            )}
            {props.labName && (
              <MetaItem
                label={t("laboratory.report.laboratory")}
                value={
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {props.labName}
                  </span>
                }
              />
            )}
            {(props.physicalSampleId || props.sampleId) && (
              <MetaItem
                label={t("laboratory.report.sampleId")}
                value={<span className="font-mono">{props.physicalSampleId || props.sampleId}</span>}
              />
            )}
            {(props.resultDate || props.collectionDate) && (
              <MetaItem
                label={t("laboratory.report.reportDate")}
                value={
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatStandardDate(new Date((props.resultDate || props.collectionDate)!))}
                  </span>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Section-mode compact title row (optional) */}
      {chrome === "section" && (props.sectionLabel || props.flags) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {props.sectionLabel && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {props.sectionLabel}
            </p>
          )}
          {props.flags && (
            <Badge
              variant="outline"
              className={
                props.flags === "critical"
                  ? "border-red-300 text-red-700 dark:text-red-300"
                  : props.flags === "abnormal"
                    ? "border-orange-300 text-orange-700 dark:text-orange-300"
                    : "border-green-300 text-green-700 dark:text-green-300"
              }
            >
              <FlagIcon flag={props.flags} />
              <span className="ms-1 capitalize">{props.flags}</span>
            </Badge>
          )}
        </div>
      )}

      {/* Body */}
      {hasTemplateContext ? (
        <div className="space-y-6">
          {groupBuckets.map((bucket, idx) => (
            <section key={bucket.group?.id || `g-${idx}`} className="space-y-2">
              {bucket.group && (
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {bilingual(bucket.group.name, bucket.group.name_ar, isRTL)}
                </h3>
              )}
              <FieldsTable
                fields={bucket.fields}
                ranges={ranges}
                resultData={resultData}
                resolveValue={resolveValue}
                isRTL={isRTL}
                tParameter={t("laboratory.report.parameter")}
                tValue={t("laboratory.report.value")}
                tUnit={t("laboratory.report.unit")}
                tReference={t("laboratory.report.referenceRange")}
                tStatus={t("laboratory.report.status")}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/30 p-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("laboratory.report.templateContextUnavailable")}</span>
          </div>
          {Object.keys(resultData).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(resultData).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium break-all">{key}</span>
                  <span className="font-mono text-muted-foreground">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extra values (keys present in result_data not covered by template) */}
      {hasTemplateContext && extraEntries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("laboratory.report.extraValues")}
          </h3>
          <div className="space-y-1.5">
            {extraEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="font-medium break-all">{key}</span>
                <span className="font-mono text-muted-foreground">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interpretation */}
      {showInterpretation && (
        <>
          <Separator />
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("laboratory.report.interpretation")}</h3>
            <InterpretationBody value={props.interpretation} />
          </section>
        </>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function FieldsTable({
  fields,
  ranges,
  resolveValue,
  isRTL,
  tParameter,
  tValue,
  tUnit,
  tReference,
  tStatus,
}: {
  fields: TemplateField[];
  ranges: Record<string, NormalRange>;
  resultData: Record<string, unknown>;
  resolveValue: (f: TemplateField) => { value: unknown; usedKey: string | null };
  isRTL: boolean;
  tParameter: string;
  tValue: string;
  tUnit: string;
  tReference: string;
  tStatus: string;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-start p-3 font-medium">{tParameter}</th>
            <th className="text-center p-3 font-medium">{tValue}</th>
            <th className="text-center p-3 font-medium">{tUnit}</th>
            <th className="text-center p-3 font-medium">{tReference}</th>
            <th className="text-center p-3 font-medium">{tStatus}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {fields.map((f, i) => {
            const { value } = resolveValue(f);
            const range = f.id ? ranges[f.id] : f.name ? ranges[f.name] : undefined;
            const status = compareToRange(value, range);
            return (
              <tr key={f.id || f.name || `row-${i}`} className="hover:bg-muted/30">
                <td className="p-3">
                  <span className="font-medium">{bilingual(f.name, f.name_ar, isRTL) || "—"}</span>
                </td>
                <td
                  className={`p-3 text-center font-mono ${
                    status === "low"
                      ? "text-blue-600"
                      : status === "high"
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {formatValue(value)}
                </td>
                <td className="p-3 text-center text-muted-foreground">
                  {bilingual(f.unit, f.unit_ar, isRTL) || "—"}
                </td>
                <td className="p-3 text-center text-muted-foreground">{formatRange(range)}</td>
                <td className="p-3 text-center">
                  <StatusIcon status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile stacked rows */}
      <div className="md:hidden divide-y">
        {fields.map((f, i) => {
          const { value } = resolveValue(f);
          const range = f.id ? ranges[f.id] : f.name ? ranges[f.name] : undefined;
          const status = compareToRange(value, range);
          const unitText = bilingual(f.unit, f.unit_ar, isRTL);
          const rangeText = formatRange(range);
          return (
            <div key={f.id || f.name || `row-${i}`} className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{bilingual(f.name, f.name_ar, isRTL) || "—"}</span>
                <StatusIcon status={status} />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-mono ${
                    status === "low"
                      ? "text-blue-600"
                      : status === "high"
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {formatValue(value)}
                </span>
                {unitText && <span className="text-xs text-muted-foreground">{unitText}</span>}
              </div>
              {rangeText && rangeText !== "—" && (
                <p className="text-xs text-muted-foreground">
                  {tReference}: {rangeText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
