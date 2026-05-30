import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useInventoryInvalidation } from './useInventoryInvalidation';

export type InventoryTransactionType = 'stock_in' | 'stock_out' | 'adjustment';

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  item_id: string;
  transaction_type: InventoryTransactionType;
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

export interface CreateInventoryTransactionInput {
  item_id: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  supplier_id?: string | null;
  notes?: string | null;
  occurred_at?: string;
}

interface UseInventoryTransactionsOptions {
  itemId?: string;
  transactionType?: InventoryTransactionType;
  limit?: number;
}

export function useInventoryTransactions(options: UseInventoryTransactionsOptions = {}) {
  const { itemId, transactionType, limit = 200 } = options;
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { toast } = useToast();
  const { invalidate } = useInventoryInvalidation();

  const transactionsQuery = useQuery({
    queryKey: ['inventory-transactions', tenantId, { itemId, transactionType, limit }],
    enabled: !!tenantId,
    queryFn: async (): Promise<InventoryTransaction[]> => {
      if (!tenantId) return [];
      let q = supabase
        .from('inventory_transactions' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (itemId) q = q.eq('item_id', itemId);
      if (transactionType) q = q.eq('transaction_type', transactionType);
      const { data, error } = await q;
      if (error) {
        console.error('[inventory] list tx failed', error);
        return [];
      }
      return (data || []) as unknown as InventoryTransaction[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (input: CreateInventoryTransactionInput): Promise<InventoryTransaction> => {
      if (!tenantId) throw new Error('No active tenant');
      const payload: Record<string, unknown> = {
        ...input,
        tenant_id: tenantId,
      };
      if (
        input.total_cost == null &&
        input.unit_cost != null &&
        input.quantity != null
      ) {
        payload.total_cost = Number(input.unit_cost) * Number(input.quantity);
      }
      const { data, error } = await supabase
        .from('inventory_transactions' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InventoryTransaction;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Transaction recorded' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to record transaction',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    transactions: transactionsQuery.data ?? [],
    isLoading: transactionsQuery.isLoading,
    createTransaction: createTransaction.mutateAsync,
    isCreating: createTransaction.isPending,
  };
}
