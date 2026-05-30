import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Canonical Inventory invalidation helper.
 * Mirrors the pattern used by Housing/Finance.
 */
export const INVENTORY_KEYS = [
  'inventory-items',
  'inventory-item',
  'inventory-transactions',
  'inventory-low-stock',
] as const;

export function useInventoryInvalidation() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const invalidate = useCallback(() => {
    INVENTORY_KEYS.forEach((key) => {
      if (tenantId) {
        queryClient.invalidateQueries({
          queryKey: [key, tenantId],
          refetchType: 'active',
        });
      }
      queryClient.invalidateQueries({
        queryKey: [key],
        refetchType: 'active',
      });
    });
  }, [queryClient, tenantId]);

  return { invalidate };
}
