import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Mapping from DB table name to the query-key prefixes that should be
 * invalidated when that table changes.  We use prefix-based invalidation
 * so that any query whose key *starts with* one of these arrays is matched.
 *
 * The tenantId placeholder is injected at runtime.
 */
const TABLE_TO_PREFIXES: Record<string, (tid: string) => string[][]> = {
  horses:                 (t) => [['horses', t], ['horse', t], ['horse-search', t]],
  horse_ownership:        (t) => [['horses', t], ['horse', t], ['party-horse-links', t]],
  horse_vaccinations:     (t) => [['vaccinations', t], ['horse', t]],
  vet_visits:             (t) => [['vet-visits', t]],
  vet_events:             (t) => [['vet-visits', t], ['vet-treatments', t]],
  vet_treatments:         (t) => [['vet-treatments', t]],
  vet_medications:        (t) => [['vet-treatments', t]],
  vet_followups:          (t) => [['vet-followups', t]],
  lab_requests:           (t) => [['lab-requests', t]],
  lab_samples:            (t) => [['lab-samples', t], ['lab-horses', t]],
  lab_results:            (t) => [['lab-results', t]],
  invoices:               (t) => [['invoices', t], ['invoice-payments'], ['invoice-payments-batch'], ['finance-summary']],
  invoice_items:          (t) => [['invoice-items'], ['invoices', t]],
  expenses:               (t) => [['expenses', t], ['finance-summary']],
  ledger_entries:         (t) => [['ledger-entries', t], ['customer-balances', t], ['client-statement', t], ['invoice-payments'], ['invoice-payments-batch'], ['ledger-balance'], ['ledger-balances']],
  clients:                (t) => [['clients', t]],
  customer_balances:      (t) => [['customer-balances', t], ['ledger-balances'], ['clients', t]],
  horse_orders:           (t) => [['horse-orders', t]],
  horse_order_events:     (t) => [['order-events', t], ['horse-orders', t]],
  horse_movements:        (t) => [['horse-movements', t]],
  housing_units:          (t) => [['housing-units', t], ['facility-areas', t]],
  housing_unit_occupants: (t) => [['unit-occupants', t], ['housing-units', t]],
  boarding_admissions:    (t) => [['boarding-admissions', t], ['boarding-admission', t]],
  boarding_status_history:(t) => [['boarding-status-history', t], ['boarding-admissions', t]],
  horse_care_notes:       (t) => [['horse-care-notes', t]],
  stable_service_plans:   (t) => [['stable-service-plans', t]],
};

/** All 20 realtime-enabled tables */
const REALTIME_TABLES = Object.keys(TABLE_TO_PREFIXES);

const DEBOUNCE_MS = 150;

/**
 * Platform-wide realtime hook.
 * Subscribes to postgres_changes on all 20 core tables for the active tenant,
 * and performs debounced, prefix-based React Query invalidation.
 *
 * Mount once in the Dashboard (org-mode root).
 */
export function useTenantRealtimeSync() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  // Debounce timers per table
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const invalidateForTable = useCallback(
    (table: string, tid: string) => {
      const prefixFn = TABLE_TO_PREFIXES[table];
      if (!prefixFn) return;

      const prefixes = prefixFn(tid);
      prefixes.forEach((prefix) => {
        queryClient.invalidateQueries({
          queryKey: prefix,
          refetchType: 'active',
        });
      });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!tenantId) return;

    const channelName = `tenant-sync-${tenantId}`;
    let channel = supabase.channel(channelName);

    REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: '*' as const,
          schema: 'public',
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Debounce per table
          const existing = timersRef.current[table];
          if (existing) clearTimeout(existing);

          timersRef.current[table] = setTimeout(() => {
            invalidateForTable(table, tenantId);
            delete timersRef.current[table];
          }, DEBOUNCE_MS);
        },
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[RealtimeSync] Subscribed: ${channelName}`);
      }
    });

    return () => {
      // Clear all pending timers
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
      supabase.removeChannel(channel);
    };
  }, [tenantId, invalidateForTable]);
}
