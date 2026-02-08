import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { queryKeys } from '@/lib/queryKeys';

interface LedgerBalance {
  client_id: string;
  balance: number;
  last_entry_at: string | null;
}

/**
 * Hook to fetch the ledger-derived balance for a specific client
 * This reads from v_customer_ledger_balances view (source of truth)
 */
export function useLedgerBalance(clientId: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledger-balance', tenantId, clientId],
    queryFn: async () => {
      if (!clientId || !tenantId) return { balance: 0 };

      const { data, error } = await supabase
        .from('v_customer_ledger_balances')
        .select('balance')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ledger balance:', error);
        return { balance: 0 };
      }

      return { balance: data?.balance || 0 };
    },
    enabled: !!clientId && !!tenantId,
  });

  return { 
    balance: data?.balance || 0, 
    loading: isLoading, 
    refresh: refetch 
  };
}

/**
 * Hook to fetch all customer balances from ledger for a tenant
 * This reads from v_customer_ledger_balances view (source of truth)
 */
export function useLedgerBalances() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: balancesData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.ledgerBalances(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_customer_ledger_balances')
        .select('client_id, balance, last_entry_at')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching ledger balances:', error);
        return [];
      }

      return data as LedgerBalance[];
    },
    enabled: !!tenantId,
  });

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    balancesData?.forEach((row) => {
      map.set(row.client_id, row.balance || 0);
    });
    return map;
  }, [balancesData]);

  const getBalance = useCallback((clientId: string) => {
    return balanceMap.get(clientId) || 0;
  }, [balanceMap]);

  return { 
    balances: balanceMap, 
    getBalance, 
    loading: isLoading, 
    refresh: refetch 
  };
}
