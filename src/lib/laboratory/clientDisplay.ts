/**
 * Client Display Helper for Laboratory Module
 * 
 * Single source of truth for resolving client names across:
 * - Registered clients (via client_id FK)
 * - Walk-in clients (inline fields on lab_samples)
 */

export interface ClientDisplaySource {
  client?: { 
    name?: string; 
    name_ar?: string | null 
  } | null;
  client_name?: string | null;
}

export interface ClientDisplayOptions {
  /** Locale for name preference (ar prefers name_ar when available) */
  locale?: 'ar' | 'en';
  /** Fallback string if no client name is available */
  fallback?: string;
}

/**
 * Resolves the display name for a lab sample's client.
 * 
 * Priority:
 * 1. Joined client record (sample.client.name or name_ar)
 * 2. Walk-in client name (sample.client_name)
 * 3. Fallback string (or null if not provided)
 * 
 * @param sample - Lab sample or object with client fields
 * @param options - Display options (locale, fallback)
 * @returns Client display name or null
 */
export function getLabClientDisplayName(
  sample: ClientDisplaySource | null | undefined,
  options?: ClientDisplayOptions
): string | null {
  if (!sample) return options?.fallback ?? null;
  
  // Priority 1: Joined client record
  if (sample.client?.name) {
    // Prefer Arabic name if locale is 'ar' and name_ar is available
    if (options?.locale === 'ar' && sample.client.name_ar) {
      return sample.client.name_ar;
    }
    return sample.client.name;
  }
  
  // Priority 2: Walk-in client name (inline field)
  if (sample.client_name) {
    return sample.client_name;
  }
  
  // Priority 3: Fallback or null
  return options?.fallback ?? null;
}

/**
 * Checks if a sample has any client associated (registered or walk-in)
 */
export function hasClient(sample: ClientDisplaySource | null | undefined): boolean {
  if (!sample) return false;
  return !!(sample.client?.name || sample.client_name);
}
