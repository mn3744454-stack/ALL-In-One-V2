import { useQuery, useMutation } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { invFrom, type InventoryItemRow } from '@/integrations/supabase/inventory.types';
import { useInventoryInvalidation } from './useInventoryInvalidation';

export type { InventoryItemRow };

/**
 * Generic, cross-tenant item categories. The UI surfaces a relevant subset
 * per tenant type (e.g. feed/hay for a stable, reagent for a lab, medication
 * for a pharmacy) but the data layer accepts any of these.
 */
export const INVENTORY_CATEGORIES = [
  'feed',
  'hay',
  'supplement',
  'bedding',
  'medication',
  'medical',
  'reagent',
  'consumable',
  'equipment',
  'other',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_UNITS = [
  'kg',
  'g',
  'bag',
  'bale',
  'sack',
  'liter',
  'ml',
  'box',
  'unit',
] as const;

export interface InventoryItem extends InventoryItemRow {
  supplier?: { id: string; name: string; name_ar: string | null } | null;
}

export interface InventoryItemFilters {
  category?: string | 'all';
  search?: string;
  lowStockOnly?: boolean;
  includeInactive?: boolean;
}

export interface CreateItemData {
  name: string;
  name_ar?: string | null;
  category: string;
  unit: string;
  sku?: string | null;
  low_stock_threshold?: number;
  cost_per_unit?: number | null;
  default_supplier_id?: string | null;
  notes?: string | null;
}

const ITEM_SELECT = `
  *,
  supplier:suppliers!default_supplier_id(id, name, name_ar)
`;

export function useInventoryItems(filters: InventoryItemFilters = {}) {
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const { invalidate } = useInventoryInvalidation();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['inventory-items', tenantId, filters],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!tenantId) return [];
      let query = invFrom('inventory_items')
        .select(ITEM_SELECT)
        .eq('tenant_id', tenantId)
        .order('name');

      if (!filters.includeInactive) query = query.eq('is_active', true);
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data || []) as unknown as InventoryItem[];

      if (filters.lowStockOnly) {
        rows = rows.filter((i) => i.current_quantity <= i.low_stock_threshold);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.name_ar || '').toLowerCase().includes(q) ||
            (i.sku || '').toLowerCase().includes(q),
        );
      }
      return rows;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateItemData) => {
      if (!tenantId) throw new Error(tGlobal('inventory.toasts.noOrg'));
      const { data: row, error } = await invFrom('inventory_items')
        .insert({ tenant_id: tenantId, ...data })
        .select(ITEM_SELECT)
        .single();
      if (error) throw error;
      return row as unknown as InventoryItem;
    },
    onSuccess: () => {
      invalidate('items');
      toast.success(tGlobal('inventory.toasts.itemCreated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateItemData> & { id: string }) => {
      const { data: row, error } = await invFrom('inventory_items')
        .update(data)
        .eq('id', id)
        .select(ITEM_SELECT)
        .single();
      if (error) throw error;
      return row as unknown as InventoryItem;
    },
    onSuccess: () => {
      invalidate('items');
      toast.success(tGlobal('inventory.toasts.itemUpdated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await invFrom('inventory_items')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate('items');
      toast.success(tGlobal('inventory.toasts.itemUpdated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    items,
    isLoading,
    error,
    canManage,
    createItem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateItem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    setItemActive: archiveMutation.mutateAsync,
  };
}
