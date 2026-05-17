/**
 * Format an analysis count with proper Arabic grammar.
 *
 * English:
 *   1 → "1 analysis"
 *   n → "n analyses"
 *
 * Arabic (CLDR-aligned, simplified):
 *   1     → "تحليل واحد"
 *   2     → "تحليلان"
 *   3–10  → "N تحاليل"
 *   11+   → "N تحليل"
 */
export function formatAnalysisCount(
  count: number,
  langOrIsRTL: string | boolean
): string {
  const isAr =
    typeof langOrIsRTL === "boolean" ? langOrIsRTL : langOrIsRTL === "ar";
  const n = Math.max(0, Math.floor(count || 0));

  if (!isAr) {
    return n === 1 ? `1 analysis` : `${n} analyses`;
  }

  if (n === 0) return `0 تحليل`;
  if (n === 1) return `تحليل واحد`;
  if (n === 2) return `تحليلان`;
  if (n >= 3 && n <= 10) return `${n} تحاليل`;
  return `${n} تحليل`;
}
