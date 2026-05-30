import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useInventoryInvalidation } from './useInventoryInvalidation';

export interface InventoryItem {
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
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemInput {
  name: string;
  name_ar?: string | null;
  category?: string;
  unit?: string;
  sku?: string | null;
  low_stock_threshold?: number;
  cost_per_unit?: number | null;
  default_supplier_id?: string | null;
  notes?: string | null;
}

export interface UpdateInventoryItemInput extends Partial<CreateInventoryItemInput> {
  id: string;
  is_active?: boolean;
  is_archived?: boolean;
}

interface UseInventoryItemsOptions {
  includeArchived?: boolean;
}

export function useInventoryItems(options: UseInventoryItemsOptions = {}) {
  const { includeArchived = false } = options;
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { toast } = useToast();
  const { invalidate } = useInventoryInvalidation();

  const itemsQuery = useQuery({
    queryKey: ['inventory-items', tenantId, { includeArchived }],
    enabled: !!tenantId,
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!tenantId) return [];
      let q = supabase
        .from('inventory_items' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (!includeArchived) q = q.eq('is_archived', false);
      const { data, error } = await q;
      if (error) {
        console.error('[inventory] list items failed', error);
        return [];
      }
      return (data || []) as unknown as InventoryItem[];
    },
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory-low-stock', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('inventory_items' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .eq('is_active', true);
      if (error) return [];
      return ((data || []) as unknown as InventoryItem[]).filter(
        (i) => Number(i.current_quantity) <= Number(i.low_stock_threshold),
      );
    },
  });

  const createItem = useMutation({
    mutationFn: async (input: CreateInventoryItemInput): Promise<InventoryItem> => {
      if (!tenantId) throw new Error('No active tenant');
      const { data, error } = await supabase
        .from('inventory_items' as any)
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InventoryItem;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inventory item created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create item', description: error.message, variant: 'destructive' });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInventoryItemInput): Promise<InventoryItem> => {
      const { data, error } = await supabase
        .from('inventory_items' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InventoryItem;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inventory item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update item', description: error.message, variant: 'destructive' });
    },
  });

  const archiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items' as any)
        .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inventory item archived' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to archive', description: error.message, variant: 'destructive' });
    },
  });

  const restoreItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items' as any)
        .update({ is_archived: false, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inventory item restored' });
    },
  });

  return {
    items: itemsQuery.data ?? [],
    isLoading: itemsQuery.isLoading,
    lowStockItems: lowStockQuery.data ?? [],
    createItem: createItem.mutateAsync,
    updateItem: updateItem.mutateAsync,
    archiveItem: archiveItem.mutateAsync,
    restoreItem: restoreItem.mutateAsync,
    isCreating: createItem.isPending,
    isUpdating: updateItem.isPending,
  };
}
