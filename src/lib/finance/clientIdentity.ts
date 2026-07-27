/**
 * Phase N+3 · Slice 3.2 — bilingual client identity helper.
 *
 * Rendering rule (matches the Dayli Horse identity standard):
 *   - When the active UI direction is RTL and an Arabic name exists, the
 *     primary label is Arabic and the secondary (parenthesised) label is the
 *     Latin name when it exists AND differs.
 *   - When the active UI direction is LTR the primary label is the Latin name
 *     (fallback: Arabic if that is the only value we have) and the secondary
 *     label is the Arabic name when it exists AND differs.
 *   - When only one language is populated, `secondary` is `null` and no
 *     parenthesised suffix is rendered.
 *
 * The helper is direction-aware but does not touch DOM — it just returns the
 * two labels so callers (dialog headers, table cells, list rows) can render
 * them consistently, always in a single line, without duplicating the logic.
 */
export interface BilingualNameInput {
  name?: string | null;
  name_ar?: string | null;
}

export interface BilingualNameLabels {
  primary: string;
  secondary: string | null;
}

export function resolveBilingualClientName(
  client: BilingualNameInput | null | undefined,
  dir: "ltr" | "rtl",
): BilingualNameLabels {
  const en = (client?.name ?? "").trim();
  const ar = (client?.name_ar ?? "").trim();
  if (!en && !ar) return { primary: "", secondary: null };
  if (dir === "rtl") {
    const primary = ar || en;
    const secondary = ar && en && ar !== en ? en : null;
    return { primary, secondary };
  }
  const primary = en || ar;
  const secondary = en && ar && en !== ar ? ar : null;
  return { primary, secondary };
}
