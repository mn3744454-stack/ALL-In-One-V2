import { supabase } from "@/integrations/supabase/client";

/**
 * Records a service (treatment/vaccination) as an internal stable cost
 * without creating a client-facing invoice.
 * Writes to financial_entries with is_income=false.
 */
export async function recordAsStableCost(params: {
  tenantId: string;
  entityType: string; // e.g. 'vet_treatment' | 'vaccination'
  entityId: string;
  amount: number;
  currency?: string;
  description?: string;
  serviceMode?: "internal" | "external";
  externalProviderId?: string | null;
}): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return false;

    // Check idempotency - don't create duplicate entries
    const { data: existing } = await supabase
      .from("financial_entries")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .eq("entity_type", params.entityType)
      .eq("entity_id", params.entityId)
      .eq("is_income", false)
      .maybeSingle();

    if (existing) return true;

    const { error } = await supabase
      .from("financial_entries")
      .insert({
        tenant_id: params.tenantId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        is_income: false,
        service_mode: params.serviceMode || "internal",
        external_provider_id: params.externalProviderId || null,
        actual_cost: params.amount,
        currency: params.currency || "SAR",
        notes: params.description || null,
        created_by: userData.user.id,
      } as any);

    if (error) {
      console.error("recordAsStableCost: Error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("recordAsStableCost: Unexpected error", err);
    return false;
  }
}
