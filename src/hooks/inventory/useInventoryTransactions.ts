import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantCurrency } from '@/hooks/useTenantCurrency';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { invFrom, type InventoryTransactionRow } from '@/integrations/supabase/inventory.types';
import { useInventoryInvalidation } from './useInventoryInvalidation';

export type { InventoryTransactionRow };

export type TransactionType = 'stock_in' | 'consumption' | 'adjustment' | 'waste';

export interface InventoryTransaction extends InventoryTransactionRow {
  item?: { id: string; name: string; name_ar: string | null; unit: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface RecordTransactionInput {
  item_id: string;
  transaction_type: TransactionType;
  /** Positive magnitude entered by the user; sign is derived from the type. */
  amount: number;
  /** For adjustments only: the new absolute on-hand count (overrides amount). */
  newQuantity?: number;
  unit_cost?: number | null;
  supplier_id?: string | null;
  /** Free-text vendor label mirrored onto the finance expense (expenses.vendor_name). */
  supplier_name?: string | null;
  notes?: string | null;
  occurred_at?: string;
  /** When true (stock_in), also create a matching finance expense. */
  createExpense?: boolean;
  /** Must be a value from finance EXPENSE_CATEGORIES (defaults to 'other'). */
  expenseCategory?: string;
}

const TX_SELECT = `
  *,
  item:inventory_items!item_id(id, name, name_ar, unit),
  supplier:suppliers!supplier_id(id, name)
`;

/** Derive the signed stock delta from a transaction type + magnitude. */
function signedDelta(type: TransactionType, amount: number): number {
  switch (type) {
    case 'stock_in':
      return Math.abs(amount);
    case 'consumption':
    case 'waste':
      return -Math.abs(amount);
    case 'adjustment':
      return amount; // caller passes an already-signed delta for adjustments
    default:
      return amount;
  }
}

export function useInventoryTransactions(itemId?: string, limit = 100) {
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const currency = useTenantCurrency();
  const tenantId = activeTenant?.tenant?.id;
  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const { invalidate } = useInventoryInvalidation();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: itemId
      ? ['inventory-item-transactions', tenantId, itemId]
      : ['inventory-transactions', tenantId, limit],
    queryFn: async (): Promise<InventoryTransaction[]> => {
      if (!tenantId) return [];
      let query = invFrom('inventory_transactions')
        .select(TX_SELECT)
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (itemId) query = query.eq('item_id', itemId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as InventoryTransaction[];
    },
    enabled: !!tenantId,
  });

  const recordMutation = useMutation({
    mutationFn: async (input: RecordTransactionInput) => {
      if (!tenantId) throw new Error(tGlobal('inventory.toasts.noOrg'));

      let delta: number;
      if (input.transaction_type === 'adjustment' && input.newQuantity !== undefined) {
        // Compute delta from current on-hand to the target count.
        const { data: itemRow, error: itemErr } = await invFrom('inventory_items')
          .select('current_quantity')
          .eq('id', input.item_id)
          .single();
        if (itemErr) throw itemErr;
        delta = input.newQuantity - (itemRow?.current_quantity ?? 0);
      } else {
        delta = signedDelta(input.transaction_type, input.amount);
      }

      const total_cost =
        input.unit_cost != null ? Math.abs(delta) * input.unit_cost : null;

      // Optional finance expense for purchases. Fields mirror the Finance
      // domain's expenses schema (currency, vendor_id/vendor_name, status).
      let expense_id: string | null = null;
      if (input.createExpense && input.transaction_type === 'stock_in' && total_cost) {
        const { data: exp, error: expErr } = await supabase
          .from('expenses')
          .insert({
            tenant_id: tenantId,
            amount: total_cost,
            currency,
            category: input.expenseCategory || 'other',
            description: tGlobal('inventory.expense.stockPurchase'),
            expense_date: (input.occurred_at || new Date().toISOString()).slice(0, 10),
            vendor_id: input.supplier_id ?? null,
            vendor_name: input.supplier_name ?? null,
            status: 'pending',
            created_by: user?.id ?? null,
          })
          .select('id')
          .single();
        if (expErr) throw expErr;
        expense_id = exp?.id ?? null;
      }

      const { data: row, error } = await invFrom('inventory_transactions')
        .insert({
          tenant_id: tenantId,
          item_id: input.item_id,
          transaction_type: input.transaction_type,
          quantity: delta,
          unit_cost: input.unit_cost ?? null,
          total_cost,
          supplier_id: input.supplier_id ?? null,
          reference_type: 'manual',
          expense_id,
          notes: input.notes ?? null,
          performed_by: user?.id ?? null,
          occurred_at: input.occurred_at || new Date().toISOString(),
        })
        .select(TX_SELECT)
        .single();
      if (error) throw error;
      return row as unknown as InventoryTransaction;
    },
    onSuccess: () => {
      // Stock change affects both the ledger and the item balance.
      invalidate(['items', 'transactions']);
      toast.success(tGlobal('inventory.toasts.transactionRecorded'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    transactions,
    isLoading,
    canManage,
    recordTransaction: recordMutation.mutateAsync,
    isRecording: recordMutation.isPending,
  };
}
