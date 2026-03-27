import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-creates a supplier_payable when a treatment/vaccination is saved
 * with service_mode='external' and valid provider info.
 * Idempotent: skips if a payable for this source already exists.
 */
export async function createSupplierPayableForExternal(params: {
  tenantId: string;
  sourceType: string; // e.g. 'vet_treatment' | 'vaccination'
  sourceId: string;
  supplierName: string;
  supplierId?: string | null;
  amount?: number;
  currency?: string;
  description?: string;
}): Promise<boolean> {
  try {
    // Check idempotency
    const { data: existing } = await supabase
      .from("supplier_payables")
      .select("id")
      .eq("tenant_id", params.tenantId)
      .eq("source_type", params.sourceType)
      .eq("source_reference", params.sourceId)
      .maybeSingle();

    if (existing) return true; // Already exists

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("supplier_payables")
      .insert({
        tenant_id: params.tenantId,
        supplier_name: params.supplierName,
        supplier_id: params.supplierId || null,
        source_type: params.sourceType,
        source_reference: params.sourceId,
        description: params.description || null,
        amount: params.amount || 0,
        amount_paid: 0,
        currency: params.currency || "SAR",
        status: "received",
        created_by: userData?.user?.id || null,
      });

    if (error) {
      console.error("createSupplierPayableForExternal: Error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("createSupplierPayableForExternal: Unexpected error", err);
    return false;
  }
}
