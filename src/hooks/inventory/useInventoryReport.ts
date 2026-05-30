import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { invFrom } from '@/integrations/supabase/inventory.types';

export interface ConsumptionRow {
  item_id: string;
  item_name: string;
  item_name_ar: string | null;
  unit: string;
  category: string;
  consumed: number; // positive magnitude consumed/wasted in the window
  stockIn: number; // positive magnitude added in the window
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  stockValue: number; // sum(current_quantity * cost_per_unit)
}

/** Aggregate consumption over the last `days` days, grouped by item. */
export function useInventoryConsumptionReport(days = 30) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['inventory-consumption-report', tenantId, days],
    queryFn: async (): Promise<ConsumptionRow[]> => {
      if (!tenantId) return [];
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await invFrom('inventory_transactions')
        .select('item_id, quantity, transaction_type, item:inventory_items!item_id(id, name, name_ar, unit, category)')
        .eq('tenant_id', tenantId)
        .gte('occurred_at', since);
      if (error) throw error;

      type ReportTxRow = {
        item_id: string;
        quantity: number;
        transaction_type: string;
        item: {
          id: string;
          name: string;
          name_ar: string | null;
          unit: string;
          category: string;
        } | null;
      };

      const map = new Map<string, ConsumptionRow>();
      for (const tx of (data || []) as unknown as ReportTxRow[]) {
        const item = tx.item;
        if (!item) continue;
        if (!map.has(tx.item_id)) {
          map.set(tx.item_id, {
            item_id: tx.item_id,
            item_name: item.name,
            item_name_ar: item.name_ar,
            unit: item.unit,
            category: item.category,
            consumed: 0,
            stockIn: 0,
          });
        }
        const row = map.get(tx.item_id)!;
        if (tx.quantity < 0) row.consumed += Math.abs(tx.quantity);
        else row.stockIn += tx.quantity;
      }
      return Array.from(map.values()).sort((a, b) => b.consumed - a.consumed);
    },
    enabled: !!tenantId,
  });
}

/** Headline inventory KPIs for the overview/stat cards. */
export function useInventoryStats() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['inventory-stats', tenantId],
    queryFn: async (): Promise<InventoryStats> => {
      if (!tenantId) return { totalItems: 0, lowStockCount: 0, stockValue: 0 };
      const { data, error } = await invFrom('inventory_items')
        .select('current_quantity, low_stock_threshold, cost_per_unit')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (error) throw error;
      const rows = data || [];
      return {
        totalItems: rows.length,
        lowStockCount: rows.filter((r) => r.current_quantity <= r.low_stock_threshold).length,
        stockValue: rows.reduce(
          (sum, r) => sum + r.current_quantity * (r.cost_per_unit ?? 0),
          0,
        ),
      };
    },
    enabled: !!tenantId,
  });
}
