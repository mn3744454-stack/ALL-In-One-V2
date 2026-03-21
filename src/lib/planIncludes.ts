/**
 * Structured schema for stable_service_plans.includes JSONB field.
 * 
 * Each entry represents a tenant_service that is included in the plan
 * at no extra charge beyond the plan's base_price.
 */
export interface IncludedServiceEntry {
  service_id: string;
  label: string;
}

/**
 * Safely normalize the raw `includes` JSONB from a plan record
 * into a typed array. Handles legacy empty objects, nulls, and
 * malformed data without throwing.
 */
export function normalizeIncludes(raw: unknown): IncludedServiceEntry[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is IncludedServiceEntry =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.service_id === 'string' &&
      typeof item.label === 'string'
  );
}
