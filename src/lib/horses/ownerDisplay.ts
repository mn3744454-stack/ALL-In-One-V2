/**
 * Owner display contract for horse list/table/card surfaces.
 *
 * Detail-page ownership remains driven by `useHorseOwnership`/`CurrentOwnership`.
 * This helper is the single source of truth for the COMPACT owner label
 * shown in HorsesTable, HorseCard, mobile/grid card variants.
 *
 * Rules (Phase 1.e.f.7.c):
 *   0 owners → localized "Unassigned" / "غير معين"
 *   1 owner  → bilingual-preferred owner name
 *   N>1      → "<primary> + (N-1)"
 *
 * Primary owner selection:
 *   is_primary === true
 *   → else max(ownership_percentage)
 *   → else most-recent created_at
 *   → else first row
 *
 * Percentages are intentionally NOT rendered here.
 */

export interface OwnerRow {
  is_primary?: boolean | null;
  ownership_percentage?: number | null;
  created_at?: string | null;
  owner?: {
    id: string;
    name?: string | null;
    name_ar?: string | null;
  } | null;
}

export interface OwnerDisplay {
  label: string;
  count: number;
  primaryOwner?: { id: string; name?: string | null; name_ar?: string | null };
}

export interface OwnerDisplayOptions {
  isRTL: boolean;
  /** i18n translator. Must support {count} interpolation for `horses.owner.plus`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function pickName(
  owner: { name?: string | null; name_ar?: string | null } | null | undefined,
  isRTL: boolean,
): string | null {
  if (!owner) return null;
  const en = owner.name?.trim() || null;
  const ar = owner.name_ar?.trim() || null;
  if (!en && !ar) return null;
  if (isRTL) return ar || en;
  return en || ar;
}

function selectPrimary(rows: OwnerRow[]): OwnerRow | null {
  if (rows.length === 0) return null;
  const explicit = rows.find((r) => r.is_primary === true);
  if (explicit) return explicit;

  const sorted = [...rows].sort((a, b) => {
    const pa = Number(a.ownership_percentage ?? 0);
    const pb = Number(b.ownership_percentage ?? 0);
    if (pb !== pa) return pb - pa;
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });
  return sorted[0] ?? rows[0];
}

export function getOwnerDisplay(
  owners: OwnerRow[] | null | undefined,
  options: OwnerDisplayOptions,
): OwnerDisplay {
  const { t, isRTL } = options;
  const valid = (owners ?? []).filter((r) => r && r.owner && r.owner.id);

  if (valid.length === 0) {
    return { label: t("horses.owner.unassigned"), count: 0 };
  }

  const primary = selectPrimary(valid)!;
  const primaryName =
    pickName(primary.owner, isRTL) || t("horses.owner.unassigned");

  if (valid.length === 1) {
    return {
      label: primaryName,
      count: 1,
      primaryOwner: primary.owner ?? undefined,
    };
  }

  const extra = valid.length - 1;
  return {
    label: `${primaryName} ${t("horses.owner.plus", { count: extra })}`,
    count: valid.length,
    primaryOwner: primary.owner ?? undefined,
  };
}
