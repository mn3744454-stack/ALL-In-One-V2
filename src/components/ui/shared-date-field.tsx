import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Label 2 — Shared platform date field (compact segmented layout).
 *
 * Contract:
 * - Direct Day / Month / Year Select controls in a single compact grid row.
 * - Compact segment labels above each Select (Day / Month / Year, localized).
 * - Internal value: yyyy-MM-dd (ISO). Display: DD-MM-YYYY (elsewhere for read-only).
 * - Month option and trigger show "MM — Name" (localized name).
 * - Today / Clear actions rendered on a separate compact action row so they
 *   never cause the D/M/Y controls to wrap.
 * - `min` / `max` (ISO yyyy-MM-dd) constrain the year range and clamp the value.
 * - RTL-safe: segment shell is forced dir="ltr" so D → M → Y ordering is stable.
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
  invalid?: boolean;
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
  invalid,
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

  const lblDay = t("common.date.day") || "Day";
  const lblMonth = t("common.date.month") || "Month";
  const lblYear = t("common.date.year") || "Year";
  const lblToday = t("common.date.today") || "Today";
  const lblClear = t("common.date.clear") || "Clear";

  const monthLabel = (i: number) =>
    `${String(i + 1).padStart(2, "0")} — ${months[i]}`;

  return (
    <div
      className={cn("w-full min-w-0", className)}
      role="group"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
    >
      {/* Segmented row — forced LTR so D → M → Y order is stable in RTL layouts */}
      <div
        dir="ltr"
        className={cn(
          "grid gap-1.5 items-end",
          "grid-cols-[minmax(56px,68px)_minmax(112px,1fr)_minmax(76px,88px)]",
        )}
      >
        {/* Day */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground mb-1 leading-none">
            {lblDay}
          </span>
          <Select
            value={parsed ? String(d) : ""}
            onValueChange={(v) => setDay(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn("h-9 tabular-nums px-2", invalid && "border-destructive")}
              aria-label={lblDay}
            >
              <SelectValue placeholder="DD" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {days.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {String(n).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground mb-1 leading-none">
            {lblMonth}
          </span>
          <Select
            value={parsed ? String(m) : ""}
            onValueChange={(v) => setMonth(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn("h-9 min-w-0 px-2", invalid && "border-destructive")}
              aria-label={lblMonth}
            >
              <SelectValue placeholder="MM">
                {parsed ? monthLabel(m - 1) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {months.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mx-1 text-muted-foreground">—</span>
                  <span>{name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground mb-1 leading-none">
            {lblYear}
          </span>
          <Select
            value={parsed ? String(y) : ""}
            onValueChange={(v) => setYear(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn("h-9 tabular-nums px-2", invalid && "border-destructive")}
              aria-label={lblYear}
            >
              <SelectValue placeholder="YYYY" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {years.map((yy) => (
                <SelectItem key={yy} value={String(yy)}>{yy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions — separate row; never causes segment wrap */}
      {(showToday || showClear) && (
        <div className="mt-1 flex items-center gap-1" dir="ltr">
          {showToday && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={setToday}
              disabled={disabled}
              aria-label={lblToday}
            >
              {lblToday}
            </Button>
          )}
          {showClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange("")}
              disabled={disabled}
              aria-label={lblClear}
            >
              {lblClear}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
