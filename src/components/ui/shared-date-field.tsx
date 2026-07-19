import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Label 2 — Shared platform date field.
 *
 * Requirements:
 * - Direct day / month / year selection (no arrow-only calendar nav).
 * - Visible display always DD-MM-YYYY regardless of browser locale.
 * - Internal value: yyyy-MM-dd (ISO, DB-friendly).
 * - RTL/LTR aware; Arabic month names localized.
 * - Optional Today and Clear actions.
 * - `min` / `max` (ISO yyyy-MM-dd) bound the year range and reject out-of-range dates.
 */

export interface SharedDateFieldProps {
  value: string; // yyyy-MM-dd or ""
  onChange: (next: string) => void;
  min?: string; // yyyy-MM-dd
  max?: string;
  showToday?: boolean;
  showClear?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function parseISO(v: string): { y: number; m: number; d: number } | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
function toISO(y: number, m: number, d: number): string {
  const yy = String(y).padStart(4, "0");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

export function SharedDateField({
  value,
  onChange,
  min,
  max,
  showToday = true,
  showClear = false,
  disabled,
  className,
  ariaLabel,
}: SharedDateFieldProps) {
  const { t, lang } = useI18n();
  const months = lang === "ar" ? AR_MONTHS : EN_MONTHS;

  const parsed = useMemo(() => parseISO(value), [value]);
  const minP = useMemo(() => parseISO(min || ""), [min]);
  const maxP = useMemo(() => parseISO(max || ""), [max]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const startYear = minP?.y ?? currentYear - 15;
  const endYear = maxP?.y ?? currentYear + 15;
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = startYear; y <= endYear; y++) out.push(y);
    return out;
  }, [startYear, endYear]);

  const y = parsed?.y ?? currentYear;
  const m = parsed?.m ?? (today.getMonth() + 1);
  const d = parsed?.d ?? today.getDate();

  const maxDay = daysInMonth(y, m);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  const clamp = (ny: number, nm: number, nd: number): string => {
    const dim = daysInMonth(ny, nm);
    const cd = Math.min(nd, dim);
    let iso = toISO(ny, nm, cd);
    if (min && iso < min) iso = min;
    if (max && iso > max) iso = max;
    return iso;
  };

  const setYear = (ny: number) => onChange(clamp(ny, m, d));
  const setMonth = (nm: number) => onChange(clamp(y, nm, d));
  const setDay = (nd: number) => onChange(clamp(y, m, nd));

  const setToday = () => {
    onChange(clamp(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} aria-label={ariaLabel} dir="ltr">
      {/* Day */}
      <Select value={parsed ? String(d) : ""} onValueChange={(v) => setDay(Number(v))} disabled={disabled}>
        <SelectTrigger className="w-[76px] h-9 tabular-nums">
          <SelectValue placeholder={t("common.date.day") || "DD"} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {days.map((n) => (
            <SelectItem key={n} value={String(n)}>{String(n).padStart(2, "0")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">-</span>
      {/* Month */}
      <Select value={parsed ? String(m) : ""} onValueChange={(v) => setMonth(Number(v))} disabled={disabled}>
        <SelectTrigger className="min-w-[120px] h-9">
          <SelectValue placeholder={t("common.date.month") || "MM"} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {months.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              <span className="tabular-nums me-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-muted-foreground">— {name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">-</span>
      {/* Year */}
      <Select value={parsed ? String(y) : ""} onValueChange={(v) => setYear(Number(v))} disabled={disabled}>
        <SelectTrigger className="w-[100px] h-9 tabular-nums">
          <SelectValue placeholder={t("common.date.year") || "YYYY"} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {years.map((yy) => (
            <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(showToday || showClear) && (
        <div className="flex items-center gap-1 ms-1">
          {showToday && (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={setToday} disabled={disabled}>
              {t("common.date.today") || "Today"}
            </Button>
          )}
          {showClear && (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange("")} disabled={disabled}>
              {t("common.date.clear") || "Clear"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
