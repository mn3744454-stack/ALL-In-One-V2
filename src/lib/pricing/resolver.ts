/**
 * Unified Pricing Resolver
 * 
 * Resolves prices from multiple sources:
 * - lab_templates (pricing JSONB)
 * - tenant_services (unit_price)
 * - products (selling_price)
 *
 * All resolve functions accept `fallbackCurrency` so callers can pass the
 * tenant-configured currency instead of assuming SAR.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PriceResult {
  unitPrice: number | null;
  currency: string;
  source: "lab_template" | "tenant_service" | "product" | "manual";
  sourceId: string;
}

/**
 * Get price from lab template's pricing JSONB
 */
export function getLabTemplatePrice(pricing: Record<string, unknown> | null): number | null {
  if (!pricing) return null;
  if (typeof pricing.base_price === "number") {
    return pricing.base_price;
  }
  return null;
}

/**
 * Get currency from lab template's pricing JSONB
 */
export function getLabTemplateCurrency(pricing: Record<string, unknown> | null, fallbackCurrency = "SAR"): string {
  if (!pricing) return fallbackCurrency;
  if (typeof pricing.currency === "string") {
    return pricing.currency;
  }
  return fallbackCurrency;
}

/**
 * Resolve price for a lab template
 */
export async function resolveLabTemplatePrice(
  templateId: string,
  tenantId: string,
  fallbackCurrency = "SAR"
): Promise<PriceResult> {
  const { data, error } = await supabase
    .from("lab_templates")
    .select("id, pricing")
    .eq("id", templateId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return { unitPrice: null, currency: fallbackCurrency, source: "lab_template", sourceId: templateId };
  }

  const pricing = data.pricing as Record<string, unknown> | null;
  return {
    unitPrice: getLabTemplatePrice(pricing),
    currency: getLabTemplateCurrency(pricing, fallbackCurrency),
    source: "lab_template",
    sourceId: templateId,
  };
}

/**
 * Resolve price for a tenant service
 */
export async function resolveServicePrice(
  serviceId: string,
  tenantId: string,
  fallbackCurrency = "SAR"
): Promise<PriceResult> {
  const { data, error } = await supabase
    .from("tenant_services")
    .select("id, unit_price")
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return { unitPrice: null, currency: fallbackCurrency, source: "tenant_service", sourceId: serviceId };
  }

  return {
    unitPrice: data.unit_price,
    currency: fallbackCurrency,
    source: "tenant_service",
    sourceId: serviceId,
  };
}

/**
 * Resolve price for a product
 */
export async function resolveProductPrice(
  productId: string,
  tenantId: string,
  fallbackCurrency = "SAR"
): Promise<PriceResult> {
  const { data, error } = await supabase
    .from("products")
    .select("id, selling_price, currency")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return { unitPrice: null, currency: fallbackCurrency, source: "product", sourceId: productId };
  }

  return {
    unitPrice: data.selling_price,
    currency: data.currency || fallbackCurrency,
    source: "product",
    sourceId: productId,
  };
}

/**
 * Check if a price result indicates missing price
 */
export function isMissingPrice(result: PriceResult): boolean {
  return result.unitPrice === null;
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null, currency = "SAR"): string {
  if (price === null) return "—";
  return `${price.toFixed(2)} ${currency}`;
}
