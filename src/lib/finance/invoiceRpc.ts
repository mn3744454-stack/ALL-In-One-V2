import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface InvoiceRpcItemInput {
  service_id?: string | null;
  service_source?: "tenant_services" | "lab_services" | null;
  description: string;
  quantity: number;
  unit_price?: number;
  horse_id?: string | null;
  lab_horse_id?: string | null;
  domain?: string | null;
  category_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  package_id?: string | null;
}

export interface InvoiceRpcPayload {
  client_id?: string | null;
  client_name?: string | null;
  issue_date: string;
  due_date?: string | null;
  notes?: string | null;
  discount_amount: number;
  items: InvoiceRpcItemInput[];
}

export interface InvoiceRpcResult {
  invoice_id: string;
  invoice_number?: string;
  status?: string;
  [key: string]: unknown;
}

export function getRiyadhDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function resultAsObject(data: Json): InvoiceRpcResult {
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new Error("FIN_RPC_INVALID_RESPONSE");
  }
  return data as InvoiceRpcResult;
}

export async function createInvoiceWithItems(
  tenantId: string,
  payload: InvoiceRpcPayload,
  idempotencyKey = crypto.randomUUID(),
): Promise<InvoiceRpcResult> {
  const { data, error } = await supabase.rpc("create_invoice_with_items", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_payload: payload as unknown as Json,
  });
  if (error) throw error;
  return resultAsObject(data);
}

export async function updateInvoiceWithItems(
  tenantId: string,
  invoiceId: string,
  payload: InvoiceRpcPayload,
  idempotencyKey = crypto.randomUUID(),
): Promise<InvoiceRpcResult> {
  const { data, error } = await supabase.rpc("update_invoice_with_items", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_invoice_id: invoiceId,
    p_payload: payload as unknown as Json,
  });
  if (error) throw error;
  return resultAsObject(data);
}

export async function approveInvoiceRpc(
  tenantId: string,
  invoiceId: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<InvoiceRpcResult> {
  const { data, error } = await supabase.rpc("approve_invoice", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_invoice_id: invoiceId,
  });
  if (error) throw error;
  return resultAsObject(data);
}

export async function cancelInvoiceRpc(
  tenantId: string,
  invoiceId: string,
  effectiveDate: string,
  reason: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<InvoiceRpcResult> {
  const { data, error } = await supabase.rpc("cancel_invoice", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_invoice_id: invoiceId,
    p_effective_date: effectiveDate,
    p_reason: reason,
  });
  if (error) throw error;
  return resultAsObject(data);
}

export async function deleteDraftInvoiceRpc(
  tenantId: string,
  invoiceId: string,
  idempotencyKey = crypto.randomUUID(),
): Promise<InvoiceRpcResult> {
  const { data, error } = await supabase.rpc("delete_draft_invoice", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_invoice_id: invoiceId,
  });
  if (error) throw error;
  return resultAsObject(data);
}
