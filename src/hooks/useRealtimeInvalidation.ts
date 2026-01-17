import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  queryKeys: (string | undefined)[][];
}

/**
 * Hook to subscribe to Supabase Realtime changes and invalidate React Query cache.
 * Use this to keep UI in sync without manual refresh.
 */
export function useRealtimeInvalidation(configs: RealtimeConfig[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!configs.length) return;

    const channelName = `realtime-${configs.map(c => c.table).join('-')}-${Date.now()}`;
    
    let channel = supabase.channel(channelName);

    configs.forEach((config) => {
      const { table, schema = 'public', event = '*', filter, queryKeys } = config;

      channel = channel.on<Record<string, unknown>>(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          
          // Invalidate all specified query keys
          queryKeys.forEach((key) => {
            // Filter out undefined values from the key
            const cleanKey = key.filter((k): k is string => k !== undefined);
            if (cleanKey.length > 0) {
              queryClient.invalidateQueries({ queryKey: cleanKey });
            }
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to channel: ${channelName}`);
      }
    });

    return () => {
      console.log(`[Realtime] Unsubscribing from channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [queryClient, JSON.stringify(configs.map(c => ({ ...c, queryKeys: c.queryKeys })))]);
}

/**
 * Convenience hook for single-table realtime subscription
 */
export function useRealtimeTable(
  table: string,
  queryKeys: (string | undefined)[][],
  options?: { event?: PostgresChangeEvent; filter?: string }
) {
  useRealtimeInvalidation([
    {
      table,
      event: options?.event,
      filter: options?.filter,
      queryKeys,
    },
  ]);
}
