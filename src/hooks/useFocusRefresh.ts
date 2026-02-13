import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

const DEBOUNCE_MS = 250;

/**
 * Safe visibility-recovery hook.
 * When the browser tab becomes visible again (e.g. after switching apps on
 * mobile), invalidates ONLY active queries for a small set of module prefixes
 * plus notifications.  Never reloads the page or resets forms.
 *
 * Mount in the Dashboard root (where both auth + tenant context are available).
 */
export function useFocusRefresh() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;

      // Debounce rapid visibility flips
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // 1. Notifications (user-scoped)
        if (user?.id) {
          queryClient.invalidateQueries({
            queryKey: ['notifications'],
            refetchType: 'active',
          });
        }

        // 2. Module prefixes for active tenant (catch up after background)
        const tid = activeTenant?.tenant_id;
        if (tid) {
          const prefixes = [
            ['horses', tid],
            ['vet-visits', tid],
            ['vet-treatments', tid],
            ['lab-requests', tid],
            ['lab-samples', tid],
            ['lab-results', tid],
            ['financial-entries', tid],
            ['ledger-balances', tid],
            ['horse-orders', tid],
            ['housing-units', tid],
          ];

          prefixes.forEach((prefix) => {
            queryClient.invalidateQueries({
              queryKey: prefix,
              refetchType: 'active',
            });
          });
        }
      }, DEBOUNCE_MS);
    };

    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queryClient, user?.id, activeTenant?.tenant_id]);
}
