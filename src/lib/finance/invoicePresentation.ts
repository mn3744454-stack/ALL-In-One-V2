/**
 * Phase 1 · N+1A — Shared Invoice Presentation Model.
 *
 * Pure, side-effect-free transformation used by Screen (InvoiceDetailsSheet),
 * PDF (InvoicePDFGenerator), and Print. Produces the canonical Horse-grouped
 * hierarchy required by the frozen product contract:
 *
 *     Horse: <Name>
 *       - financial parent item (Service / Manual)
 *       - Package parent (financial)
 *           ↳ Included child snapshots (non-financial)
 *     ...
 *     Client-Level Charges
 *       - unattributed financial items
 *
 * Rules:
 *   - Package children contribute ZERO to any total. They are presentation
 *     snapshots only. Package parents remain the sole financial contributors.
 *   - The same Package inserted twice with different Horses stays as two
 *     distinct financial parents in the respective Horse groups. Never merge
 *     by package_id.
 *   - Duplicate labels between service snapshot name and description are
 *     suppressed once normalized (whitespace + case). Distinct descriptions
 *     always remain visible.
 *   - Client-Level is one group regardless of item count.
 */

export interface RawInvoiceItemForPresentation {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;

  horse_id?: string | null;
  lab_horse_id?: string | null;

  // Snapshot / resolution fields (already enriched by the caller when
  // available). PDF/Print callers must enrich in the same way as Screen.
  service_name_snapshot?: string | null;
  service_name_ar_snapshot?: string | null;
  category_name_snapshot?: string | null;
  category_name_ar_snapshot?: string | null;

  resolvedHorseName?: string | null;
  /** Phase N+1A refinement: bilingual identity kept separately so the presenter
   *  can render `الخيل: فاتن (Fatin)` / `Horse: Fatin (فاتن)`. */
  resolvedHorseNameAr?: string | null;
  resolvedHorseNameEn?: string | null;
  resolvedServiceName?: string | null;
  resolvedCategoryName?: string | null;

  enrichedDescription?: string | null;

  package_id?: string | null;
  package_services_snapshot?: Array<{
    service_id?: string;
    name?: string | null;
    name_ar?: string | null;
    quantity?: number | null;
  }> | null;
}

export type PresentationGroupKind = "horse" | "lab_horse" | "client_level";

export interface PresentationChild {
  key: string;
  name: string;
  quantity: number;
}

export interface PresentationItem {
  id: string;
  description: string;
  /** Service snapshot label; null when suppressed as a duplicate of description. */
  serviceLabel: string | null;
  categoryLabel: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  isPackage: boolean;
  children: PresentationChild[];
}

export interface PresentationGroup {
  /** Stable, unique key for the group. */
  key: string;
  kind: PresentationGroupKind;
  /** Display name for Horse groups; null for Client-Level. Locale-picked. */
  horseName: string | null;
  /** Phase N+1A refinement: bilingual name sides preserved so callers can
   *  render `الخيل: فاتن (Fatin)` / `Horse: Fatin (فاتن)`. Null for Client-Level. */
  horseNameAr: string | null;
  horseNameEn: string | null;
  items: PresentationItem[];
  /** Sum of parent item.total_price. Children never contribute. */
  itemsTotal: number;
}

export interface InvoicePresentation {
  groups: PresentationGroup[];
  parentItemCount: number;
  childItemCount: number;
  /** Sum of parent totals only — matches invoice subtotal semantics. */
  computedItemsSubtotal: number;
}

export interface BuildPresentationOptions {
  lang?: "en" | "ar" | string;
  /** Label used for the Client-Level group when no items match a horse. */
  clientLevelLabel: string;
}

const CLIENT_LEVEL_KEY = "__client_level__";

function pickBilingual(en?: string | null, ar?: string | null, lang?: string): string | null {
  const isAr = lang === "ar";
  const primary = isAr ? ar : en;
  const secondary = isAr ? en : ar;
  return (primary && primary.trim()) || (secondary && secondary.trim()) || null;
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Build the canonical Horse-grouped presentation model for one invoice.
 * Pure function — never mutates its inputs.
 */
export function buildInvoicePresentation(
  items: RawInvoiceItemForPresentation[],
  options: BuildPresentationOptions,
): InvoicePresentation {
  const { lang, clientLevelLabel } = options;

  // Preserve caller-provided ordering. groupsByKey retains insertion order.
  const groupsByKey = new Map<string, PresentationGroup>();
  let parentItemCount = 0;
  let childItemCount = 0;
  let computedItemsSubtotal = 0;

  for (const raw of items) {
    let groupKey: string;
    let kind: PresentationGroupKind;
    let horseName: string | null;
    let horseNameAr: string | null = null;
    let horseNameEn: string | null = null;

    if (raw.horse_id || raw.lab_horse_id) {
      groupKey = raw.horse_id ? `horse:${raw.horse_id}` : `lab_horse:${raw.lab_horse_id}`;
      kind = raw.horse_id ? "horse" : "lab_horse";
      horseNameAr = (raw.resolvedHorseNameAr && raw.resolvedHorseNameAr.trim()) || null;
      horseNameEn = (raw.resolvedHorseNameEn && raw.resolvedHorseNameEn.trim()) || null;
      // Locale-picked fallback for legacy consumers.
      horseName =
        (raw.resolvedHorseName && raw.resolvedHorseName.trim()) ||
        (lang === "ar" ? horseNameAr || horseNameEn : horseNameEn || horseNameAr) ||
        null;
    } else {
      groupKey = CLIENT_LEVEL_KEY;
      kind = "client_level";
      horseName = null;
    }

    let group = groupsByKey.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        kind,
        horseName: kind === "client_level" ? null : horseName,
        horseNameAr: kind === "client_level" ? null : horseNameAr,
        horseNameEn: kind === "client_level" ? null : horseNameEn,
        items: [],
        itemsTotal: 0,
      };
      groupsByKey.set(groupKey, group);
    } else if (kind !== "client_level") {
      // Later item may carry a bilingual side that the first item was missing.
      if (!group.horseNameAr && horseNameAr) group.horseNameAr = horseNameAr;
      if (!group.horseNameEn && horseNameEn) group.horseNameEn = horseNameEn;
      if (!group.horseName && horseName) group.horseName = horseName;
    }

    const isPackage = !!raw.package_id;
    const rawDesc = (raw.enrichedDescription ?? raw.description ?? "").trim();

    // Service snapshot label from either pre-resolved value or raw snapshots.
    const snapshotServiceName =
      (raw.resolvedServiceName && raw.resolvedServiceName.trim()) ||
      pickBilingual(raw.service_name_snapshot, raw.service_name_ar_snapshot, lang);
    const snapshotCategoryName =
      (raw.resolvedCategoryName && raw.resolvedCategoryName.trim()) ||
      pickBilingual(raw.category_name_snapshot, raw.category_name_ar_snapshot, lang);

    const serviceLabel =
      snapshotServiceName && normalize(snapshotServiceName) !== normalize(rawDesc)
        ? snapshotServiceName
        : null;

    // Children — snapshot only, zero financial contribution.
    const children: PresentationChild[] = [];
    if (isPackage && Array.isArray(raw.package_services_snapshot)) {
      for (let idx = 0; idx < raw.package_services_snapshot.length; idx++) {
        const c = raw.package_services_snapshot[idx] || {};
        const name =
          pickBilingual(c.name ?? null, c.name_ar ?? null, lang) ||
          (c.name ?? c.name_ar ?? "");
        children.push({
          key: `${raw.id}:${c.service_id ?? idx}:${idx}`,
          name,
          quantity: Number(c.quantity ?? 1) || 1,
        });
      }
    }

    const parentTotal = Number(raw.total_price) || 0;

    group.items.push({
      id: raw.id,
      description: rawDesc,
      serviceLabel,
      categoryLabel: snapshotCategoryName || null,
      quantity: Number(raw.quantity) || 0,
      unit_price: Number(raw.unit_price) || 0,
      total_price: parentTotal,
      isPackage,
      children,
    });
    group.itemsTotal += parentTotal;
    parentItemCount += 1;
    childItemCount += children.length;
    computedItemsSubtotal += parentTotal;
  }

  // Reorder groups so Client-Level always comes after Horse groups. Horse
  // groups keep their first-occurrence insertion order.
  const horseGroups: PresentationGroup[] = [];
  let clientLevel: PresentationGroup | null = null;
  for (const g of groupsByKey.values()) {
    if (g.kind === "client_level") clientLevel = g;
    else horseGroups.push(g);
  }

  // Fill fallback horse names for groups whose caller could not resolve one.
  for (const g of horseGroups) {
    if (!g.horseName) g.horseName = clientLevelLabel; // caller may re-map before render
  }

  const groups: PresentationGroup[] = clientLevel
    ? [...horseGroups, clientLevel]
    : horseGroups;

  return {
    groups,
    parentItemCount,
    childItemCount,
    computedItemsSubtotal: Math.round(computedItemsSubtotal * 100) / 100,
  };
}

/**
 * Statement Horse-filter helper — mirrors the direct-invoice_items filter used
 * by ClientStatementTab and lets us unit-test the invariant that a Package
 * parent carrying `horse_id` is matched by that horse.
 *
 * Given a set of items already scoped to an invoice, return true when any item
 * belongs to a selected horse. The direct filter path uses `horse_id`; the
 * `lab_horse_id` path in the statement UI is served via lab_samples and is
 * out of Phase 1 scope.
 */
export function invoiceItemsMatchHorseSelection(
  items: Array<Pick<RawInvoiceItemForPresentation, "horse_id" | "lab_horse_id">>,
  selectedHorseIds: string[],
): boolean {
  if (selectedHorseIds.length === 0) return false;
  const selected = new Set(selectedHorseIds);
  for (const item of items) {
    if (item.horse_id && selected.has(item.horse_id)) return true;
    if (item.lab_horse_id && selected.has(item.lab_horse_id)) return true;
  }
  return false;
}

/**
 * Phase N+1A refinement — pure bilingual heading formatter shared by Screen
 * and PDF/Print. Produces:
 *   - AR both:     `<groupLabel>: فاتن (Fatin)`
 *   - EN both:     `<groupLabel>: Fatin (فاتن)`
 *   - single side: `<groupLabel>: <name>`
 *   - identical (post-normalize) sides: `<groupLabel>: <name>` once.
 *   - none:        `<groupLabel>: <unassignedFallback>` (parenthesis-free).
 *
 * Returns primary + optional secondary + optional shared label prefix. Callers
 * decide how to render (mute the secondary, escape for HTML, etc.).
 */
export interface HorseHeadingParts {
  /** Localized `الخيل` / `Horse` label (colon appended by caller if desired). */
  label: string;
  /** Primary-language name. Never empty. */
  primary: string;
  /** Secondary-language name. Null when only one side exists or sides collide. */
  secondary: string | null;
}

export function formatHorseHeadingParts(
  group: Pick<PresentationGroup, "horseNameAr" | "horseNameEn" | "horseName">,
  lang: string | undefined,
  labels: { horseGroupLabel: string; unassignedHorseLabel: string },
): HorseHeadingParts {
  const isAr = lang === "ar";
  const ar = (group.horseNameAr ?? "").trim();
  const en = (group.horseNameEn ?? "").trim();
  const fallback = (group.horseName ?? "").trim();
  const primaryRaw = isAr ? ar || en || fallback : en || ar || fallback;
  const secondaryRaw = isAr ? en : ar;
  const primary = primaryRaw || labels.unassignedHorseLabel;
  const secondary =
    primaryRaw && secondaryRaw && normalize(secondaryRaw) !== normalize(primaryRaw)
      ? secondaryRaw
      : null;
  return { label: labels.horseGroupLabel, primary, secondary };
}

