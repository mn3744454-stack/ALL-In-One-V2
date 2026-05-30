import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Canonical Inventory invalidation helper.
 *
 * Mirrors the Housing invalidation pattern: a single source of truth for
 * invalidating Inventory-domain React Query caches by scope.
 *
 *   item create/edit/archive   → ['items']
 *   stock transaction          → ['items','transactions']  (stock changes the item balance)
 *   supplier create/edit       → ['suppliers']
 */
export type InventoryScope = 'items' | 'transactions' | 'suppliers' | 'all';

const KEY_MAP: Record<Exclude<InventoryScope, 'all'>, readonly string[]> = {
  items: [
    'inventory-items',
    'inventory-item',
    'inventory-low-stock',
    'inventory-stats',
  ],
  transactions: [
    'inventory-transactions',
    'inventory-item-transactions',
    'inventory-consumption-report',
    'inventory-stats',
  ],
  suppliers: [
    'inventory-suppliers',
  ],
};

function resolveKeys(scopes: InventoryScope[]): string[] {
  if (scopes.includes('all')) {
    const all = new Set<string>();
    Object.values(KEY_MAP).forEach((family) => family.forEach((k) => all.add(k)));
    return Array.from(all);
  }
  const out = new Set<string>();
  scopes.forEach((scope) => {
    if (scope === 'all') return;
    KEY_MAP[scope].forEach((k) => out.add(k));
  });
  return Array.from(out);
}

export function useInventoryInvalidation() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const invalidate = useCallback(
    (scopes: InventoryScope | InventoryScope[]) => {
      const scopeList = Array.isArray(scopes) ? scopes : [scopes];
      const keys = resolveKeys(scopeList);
      keys.forEach((key) => {
        if (tenantId) {
          queryClient.invalidateQueries({ queryKey: [key, tenantId], refetchType: 'active' });
        }
        queryClient.invalidateQueries({ queryKey: [key], refetchType: 'active' });
      });
    },
    [queryClient, tenantId],
  );

  return { invalidate };
}
