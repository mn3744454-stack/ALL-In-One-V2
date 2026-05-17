import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";

/**
 * L4-a-3b E2-A — Safe renderer for free-form interpretation payloads.
 *
 * Replaces raw `JSON.stringify` rendering. Accepts:
 *  - string
 *  - { notes }
 *  - { notes_en, notes_ar }
 *  - { summary, recommendations, status }
 *  - arbitrary primitive-keyed objects
 *
 * Returns `null` when there is nothing meaningful to render — callers may
 * therefore skip surrounding chrome based on `hasInterpretationContent`.
 */
export function hasInterpretationContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value as object).length > 0;
}

export function InterpretationBody({ value }: { value: unknown }) {
  const { t, lang } = useI18n();

  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return (
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trimmed}</p>
    );
  }

  if (typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return null;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const notes = str(obj.notes);
  const notesEn = str(obj.notes_en);
  const notesAr = str(obj.notes_ar);
  const summary = str(obj.summary);
  const status = str(obj.status);
  const recommendations = Array.isArray(obj.recommendations)
    ? (obj.recommendations.filter(
        (r): r is string => typeof r === "string" && !!r.trim()
      ) as string[])
    : [];

  const localizedNotes =
    lang === "ar" ? notesAr || notesEn : notesEn || notesAr;
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
    recommendations.length > 0 ||
    extra.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-3 text-sm">
      {summary && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("laboratory.report.interpretationSummary")}
          </p>
          <p className="text-foreground whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {primaryNotes && (
        <p className="text-muted-foreground whitespace-pre-wrap">
          {primaryNotes}
        </p>
      )}

      {recommendations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("laboratory.report.interpretationRecommendations")}
          </p>
          <ul className="list-disc ps-5 space-y-0.5 text-muted-foreground">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {status && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("laboratory.report.interpretationStatus")}:
          </span>
          <Badge variant="outline" className="text-xs capitalize">
            {status}
          </Badge>
        </div>
      )}

      {extra.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {extra.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-xs text-muted-foreground capitalize">
                {k.replace(/_/g, " ")}
              </dt>
              <dd className="text-foreground break-words">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
