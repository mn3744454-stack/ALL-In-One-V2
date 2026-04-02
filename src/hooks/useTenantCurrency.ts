import { useTenant } from "@/contexts/TenantContext";

/**
 * Returns the active tenant's configured currency code (ISO 4217).
 * Falls back to 'SAR' when no tenant is active or currency is not set.
 */
export function useTenantCurrency(): string {
  const { activeTenant } = useTenant();
  return activeTenant?.tenant?.currency || "SAR";
}
