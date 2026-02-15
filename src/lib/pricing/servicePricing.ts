/**
 * Phase 13: Hybrid Service Pricing
 *
 * Computes unit price for a lab_service based on pricing_mode:
 *   - 'sum_templates': sum linked templates' base_price
 *   - 'override': use override_price
 * Then applies optional discount (percentage or fixed).
 */

import { supabase } from "@/integrations/supabase/client";

export interface ServicePricingFields {
  pricing_mode: string;
  override_price: number | null;
  discount_type: string | null;
  discount_value: number | null;
  currency: string | null;
  price: number | null; // legacy field
}

export interface ServicePricingResult {
  unitPrice: number | null;
  currency: string;
  pricingRule: {
    pricing_mode: string;
    override_price: number | null;
    discount_type: string | null;
    discount_value: number | null;
    computed_from: string;
    sum_templates_value: number | null;
    timestamp: string;
  };
}

/**
 * Compute unit price for a service using the hybrid pricing model.
 */
export async function computeServicePrice(
  serviceId: string,
  tenantId: string,
  service: ServicePricingFields
): Promise<ServicePricingResult> {
  const currency = service.currency || "SAR";
  let baseValue: number | null = null;
  let sumTemplatesValue: number | null = null;

  if (service.pricing_mode === "override" && service.override_price != null) {
    baseValue = service.override_price;
  } else {
    // sum_templates mode: sum linked templates' base_price
    const { data: mappings, error } = await supabase
      .from("lab_service_templates")
      .select("template_id")
      .eq("tenant_id", tenantId)
      .eq("service_id", serviceId);

    if (!error && mappings && mappings.length > 0) {
      const templateIds = mappings.map((m) => m.template_id);
      const { data: templates } = await supabase
        .from("lab_templates")
        .select("pricing")
        .in("id", templateIds);

      if (templates) {
        let sum = 0;
        for (const t of templates) {
          const pricing = t.pricing as Record<string, unknown> | null;
          if (pricing && typeof pricing.base_price === "number") {
            sum += pricing.base_price;
          }
        }
        sumTemplatesValue = sum;
        baseValue = sum;
      }
    }

    // Fallback to legacy price field
    if (baseValue === null || baseValue === 0) {
      baseValue = service.price;
    }
  }

  // Apply discount
  let finalPrice = baseValue;
  if (finalPrice != null && service.discount_type && service.discount_value != null) {
    if (service.discount_type === "percentage") {
      finalPrice = Math.max(0, finalPrice * (1 - service.discount_value / 100));
    } else if (service.discount_type === "fixed") {
      finalPrice = Math.max(0, finalPrice - service.discount_value);
    }
  }

  return {
    unitPrice: finalPrice,
    currency,
    pricingRule: {
      pricing_mode: service.pricing_mode,
      override_price: service.override_price,
      discount_type: service.discount_type,
      discount_value: service.discount_value,
      computed_from: "service",
      sum_templates_value: sumTemplatesValue,
      timestamp: new Date().toISOString(),
    },
  };
}
