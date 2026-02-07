import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface CustomerBalance {
  client_id: string;
  balance: number;
  currency: string;
}

/**
 * Hook to fetch the ledger-derived balance for a specific client
 * This uses the customer_balances table which is updated from ledger_entries
 */
export function useCustomerBalance(clientId: string | null) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { activeTenant } = useTenant();

  const fetchBalance = useCallback(async () => {
    if (!clientId || !activeTenant?.tenant?.id) {
      setBalance(0);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('client_id', clientId)
        .eq('tenant_id', activeTenant.tenant.id)
        .maybeSingle();

      if (error) throw error;
      
      // Balance from ledger: positive = client owes, negative = credit
      setBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [clientId, activeTenant?.tenant?.id]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}

/**
 * Hook to fetch all customer balances for a tenant
 */
export function useCustomerBalances() {
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const { activeTenant } = useTenant();

  const fetchBalances = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setBalances(new Map());
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_balances')
        .select('client_id, balance')
        .eq('tenant_id', activeTenant.tenant.id);

      if (error) throw error;
      
      const balanceMap = new Map<string, number>();
      data?.forEach((row: { client_id: string; balance: number }) => {
        balanceMap.set(row.client_id, row.balance || 0);
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Error fetching customer balances:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const getBalance = useCallback((clientId: string) => {
    return balances.get(clientId) || 0;
  }, [balances]);

  return { balances, getBalance, loading, refresh: fetchBalances };
}
