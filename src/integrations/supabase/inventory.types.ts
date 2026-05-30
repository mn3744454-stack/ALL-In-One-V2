/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Local row types + table accessor for the Inventory module tables.
 *
 * The generated `Database` type in `types.ts` is regenerated from Supabase and
 * will include `inventory_items` / `inventory_transactions` once the inventory
 * migration is applied. Until then, these hand-written row types let the module
 * compile, and `invFrom()` centralises the loose table access (the same idea as
 * the existing useExpenses → from("expenses" as any) pattern) so the data hooks
 * stay free of inline casts.
 */
import { supabase } from './client';

export type InventoryTable = 'inventory_items' | 'inventory_transactions';

/** Loosely-typed accessor for Inventory tables not yet in the generated types. */
export function invFrom(table: InventoryTable) {
  return (supabase as any).from(table);
}

export interface InventoryItemRow {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  category: string;
  unit: string;
  sku: string | null;
  low_stock_threshold: number;
  current_quantity: number;
  cost_per_unit: number | null;
  default_supplier_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransactionRow {
  id: string;
  tenant_id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  supplier_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  expense_id: string | null;
  notes: string | null;
  performed_by: string | null;
  occurred_at: string;
  created_at: string;
}
