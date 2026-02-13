import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const DEBOUNCE_MS = 250;

/**
 * Safe visibility-recovery hook.
 * When the browser tab becomes visible again (e.g. after switching apps on
 * mobile), invalidates ONLY notifications so the badge catches up.
 * Never reloads the page or resets forms.
 *
 * Mount in the Dashboard root (where auth context is available).
 */
export function useFocusRefresh() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (user?.id) {
          queryClient.invalidateQueries({
            queryKey: ['notifications'],
            refetchType: 'all',
          });
        }
      }, DEBOUNCE_MS);
    };

    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queryClient, user?.id]);
}
