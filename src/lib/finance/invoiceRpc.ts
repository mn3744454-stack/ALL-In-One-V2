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

// =====================================================================
// Typed wrapper for public.create_source_checkout_invoice(uuid,uuid,jsonb)
// (installed by Migration A — Slice 01 Turn 2R).
// =====================================================================

export type SourceCheckoutSourceType = "lab_sample" | "horse_order";
export type SourceCheckoutLinkKind = "deposit" | "final";
export type SourceCheckoutPaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "debt";

export interface LabSampleCheckoutItem {
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
}

interface SourceCheckoutCommonPayload {
  client_name?: string;
  discount_amount?: number;
  prices_include_tax?: boolean;
  notes?: string;
  payment_method: SourceCheckoutPaymentMethod;
}

export interface LabSampleCheckoutPayload extends SourceCheckoutCommonPayload {
  source_type: "lab_sample";
  source_id: string;
  link_kind: SourceCheckoutLinkKind;
  items: LabSampleCheckoutItem[];
}

export interface HorseOrderCheckoutPayload extends SourceCheckoutCommonPayload {
  source_type: "horse_order";
  source_id: string;
  link_kind: "final";
}

export type SourceCheckoutPayload =
  | LabSampleCheckoutPayload
  | HorseOrderCheckoutPayload;

export interface SourceCheckoutResult {
  invoice_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  prices_include_tax: boolean;
  currency: string;
  status: string;
  payment_method: SourceCheckoutPaymentMethod;
  client_id: string | null;
  client_name: string | null;
  source_type: SourceCheckoutSourceType;
  source_id: string;
  source_link_kind: SourceCheckoutLinkKind;
  source_billing_link_id: string;
  payment_result: Json | null;
}

function buildRpcPayload(payload: SourceCheckoutPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {
    source_type: payload.source_type,
    source_id: payload.source_id,
    link_kind: payload.link_kind,
    payment_method: payload.payment_method,
  };
  if (payload.client_name !== undefined) out.client_name = payload.client_name;
  if (payload.discount_amount !== undefined) out.discount_amount = payload.discount_amount;
  if (payload.prices_include_tax !== undefined) {
    out.prices_include_tax = payload.prices_include_tax;
  }
  if (payload.notes !== undefined) out.notes = payload.notes;
  if (payload.source_type === "lab_sample") {
    out.items = payload.items;
  }
  return out;
}

/**
 * Atomic source checkout — wraps `public.create_source_checkout_invoice`.
 *
 * Callers MUST provide an explicit idempotency key (one-key-per-open-session
 * behavior is owned by the calling surface, not this utility).
 *
 * Live RPC contract: `link_kind` is required (`FIN_LINK_KIND_REQUIRED` on
 * absence). Horse Order with `deposit` raises `FIN_HORSE_ORDER_LINK_KIND_INVALID`.
 * This wrapper enforces both invariants at the TypeScript type level.
 *
 * Supabase RPC errors are re-thrown unchanged; `FIN_IDEMPOTENCY_CONFLICT` is
 * NOT converted to success.
 */
export async function createSourceCheckoutInvoice(
  tenantId: string,
  idempotencyKey: string,
  payload: SourceCheckoutPayload,
): Promise<SourceCheckoutResult> {
  const { data, error } = await supabase.rpc("create_source_checkout_invoice", {
    p_tenant_id: tenantId,
    p_idempotency_key: idempotencyKey,
    p_payload: buildRpcPayload(payload) as unknown as Json,
  });
  if (error) throw error;
  return resultAsObject(data) as unknown as SourceCheckoutResult;
}
