/**
 * Stage C · Slice C — Financial Entries read-time business-date inheritance.
 *
 * `financial_entries` has NO business-date column. The economic (cost) date of
 * an internal cost entry is owned by the linked operational source event and is
 * resolved at READ TIME only:
 *
 *   entity_type          source table          authoritative source date
 *   -------------------  --------------------  ------------------------------
 *   vet_treatment        vet_treatments        completed_at, else scheduled_for
 *   vaccination          horse_vaccinations    administered_date
 *   breeding_attempt     breeding_attempts     attempt_date
 *   foaling              foalings              foaling_date
 *
 * CONTRACT (Owner-approved, Modified Option A):
 *   - No database column is added, no data is backfilled, no writer changes.
 *   - `created_at` is NEVER used as the business date — not even as a fallback.
 *   - When the source event or its date cannot be proven, the business date is
 *     `null` (Unknown). Never zero, never today, never a fabricated date.
 *   - `created_at` remains available strictly as the audit timestamp
 *     ("Recorded On" / "تاريخ التسجيل") and as a deterministic tie-breaker.
 *   - Resolution is batched: one query per entity type, never per row.
 *   - Resolved dates are never written back to the database.
 */
import { toEconomicDateString } from "@/lib/finance/effectiveDate";

/** Physical shape of an authoritative source-date column. */
export type SourceDateKind = "date" | "timestamptz";

export interface SourceDateContract {
  /** Source table holding the operational event. */
  table: string;
  /**
   * Authoritative source-date columns in priority order. The first column with
   * a value wins. Audit columns (`created_at` / `updated_at`) are deliberately
   * absent — they must never resolve a business date.
   */
  dateColumns: string[];
  /** Physical type of the listed columns. */
  kind: SourceDateKind;
}

/**
 * Verified against live schema and the current source writers/UI:
 * only these four `financial_entries.entity_type` values have a proven
 * authoritative business date. Any other type resolves to Unknown.
 */
export const FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS: Record<string, SourceDateContract> = {
  vet_treatment: {
    table: "vet_treatments",
    // `completed_at` is the service-occurrence date; `scheduled_for` is the
    // planned service date used while the treatment is not yet completed.
    // `requested_at` is a request/administrative timestamp and is excluded.
    dateColumns: ["completed_at", "scheduled_for"],
    kind: "timestamptz",
  },
  vaccination: {
    table: "horse_vaccinations",
    // `due_date` is a future schedule, not an occurrence — excluded.
    dateColumns: ["administered_date"],
    kind: "date",
  },
  breeding_attempt: {
    table: "breeding_attempts",
    dateColumns: ["attempt_date"],
    kind: "timestamptz",
  },
  foaling: {
    table: "foalings",
    dateColumns: ["foaling_date"],
    kind: "date",
  },
};

/** Entity types with a proven source-date contract. */
export function isSupportedSourceType(entityType: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS,
    entityType
  );
}

/** Columns to select for a supported entity type (id + date columns only). */
export function sourceSelectColumns(entityType: string): string | null {
  const contract = FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS[entityType];
  if (!contract) return null;
  return ["id", ...contract.dateColumns].join(", ");
}

/** Normalize a raw source value to a date-only `yyyy-MM-dd` economic date. */
export function normalizeSourceDate(
  value: unknown,
  kind: SourceDateKind
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (kind === "date") {
    const iso = toEconomicDateString(String(value));
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  // timestamptz: convert to the viewer's calendar day rather than slicing the
  // UTC string, so an evening local event never reports the following day.
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return toEconomicDateString(parsed);
}

export interface ResolvedSourceDate {
  /** Date-only economic date, or null when unresolved. */
  businessDate: string | null;
  /** Which source column proved the date, or null when unresolved. */
  businessDateSource: string | null;
}

/** Resolve the business date for one source row of a given entity type. */
export function pickSourceBusinessDate(
  entityType: string,
  row: Record<string, unknown> | null | undefined
): ResolvedSourceDate {
  const contract = FINANCIAL_ENTRY_SOURCE_DATE_CONTRACTS[entityType];
  if (!contract || !row) return { businessDate: null, businessDateSource: null };
  for (const column of contract.dateColumns) {
    const normalized = normalizeSourceDate(row[column], contract.kind);
    if (normalized) {
      return {
        businessDate: normalized,
        businessDateSource: `${contract.table}.${column}`,
      };
    }
  }
  return { businessDate: null, businessDateSource: null };
}

/** Lookup key for a resolved source row: `entity_type:entity_id`. */
export function sourceLookupKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/**
 * Group entity ids by supported entity type. Unsupported types are omitted,
 * which guarantees they resolve to Unknown rather than to any fallback.
 */
export function groupSourceIdsByType(
  entries: Array<{ entity_type: string; entity_id: string }>
): Record<string, string[]> {
  const grouped: Record<string, Set<string>> = {};
  for (const entry of entries) {
    if (!isSupportedSourceType(entry.entity_type)) continue;
    if (!entry.entity_id) continue;
    (grouped[entry.entity_type] ||= new Set()).add(entry.entity_id);
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([type, ids]) => [type, Array.from(ids)])
  );
}

/** Build the in-memory lookup from batched source rows. */
export function buildSourceDateLookup(
  batches: Array<{ entityType: string; rows: Array<Record<string, unknown>> }>
): Record<string, ResolvedSourceDate> {
  const lookup: Record<string, ResolvedSourceDate> = {};
  for (const batch of batches) {
    for (const row of batch.rows || []) {
      const id = row?.id;
      if (typeof id !== "string") continue;
      lookup[sourceLookupKey(batch.entityType, id)] = pickSourceBusinessDate(
        batch.entityType,
        row
      );
    }
  }
  return lookup;
}

export interface BusinessDatedEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  business_date: string | null;
  business_date_source: string | null;
}

/** Attach `business_date` / `business_date_source` additively to each entry. */
export function attachBusinessDates<
  T extends { id: string; entity_type: string; entity_id: string; created_at: string }
>(entries: T[], lookup: Record<string, ResolvedSourceDate>): Array<T & BusinessDatedEntry> {
  return entries.map((entry) => {
    const resolved = lookup[sourceLookupKey(entry.entity_type, entry.entity_id)];
    return {
      ...entry,
      business_date: resolved?.businessDate ?? null,
      business_date_source: resolved?.businessDateSource ?? null,
    };
  });
}

/**
 * Deterministic descending order:
 *   business_date DESC, NULLS LAST, created_at DESC, id DESC.
 */
export function compareFinancialEntryOrder(
  a: Pick<BusinessDatedEntry, "business_date" | "created_at" | "id">,
  b: Pick<BusinessDatedEntry, "business_date" | "created_at" | "id">
): number {
  const da = a.business_date;
  const db = b.business_date;
  if (da && db) {
    if (da !== db) return da < db ? 1 : -1;
  } else if (da && !db) {
    return -1; // unresolved dates always last
  } else if (!da && db) {
    return 1;
  }
  const ca = a.created_at || "";
  const cb = b.created_at || "";
  if (ca !== cb) return ca < cb ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/** Sort a full in-memory collection with the canonical ordering (immutable). */
export function sortFinancialEntries<
  T extends Pick<BusinessDatedEntry, "business_date" | "created_at" | "id">
>(entries: T[]): T[] {
  return [...entries].sort(compareFinancialEntryOrder);
}
