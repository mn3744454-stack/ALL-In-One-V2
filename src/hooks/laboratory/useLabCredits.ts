import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LabCreditWallet {
  id: string;
  tenant_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type LabCreditTxnType = 'purchase' | 'debit' | 'refund';

export interface LabCreditTransaction {
  id: string;
  tenant_id: string;
  wallet_id: string;
  txn_type: LabCreditTxnType;
  samples_count: number;
  sample_ref: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  creator?: { id: string; full_name: string | null } | null;
}

export function useLabCredits() {
  const [wallet, setWallet] = useState<LabCreditWallet | null>(null);
  const [transactions, setTransactions] = useState<LabCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditsEnabled, setCreditsEnabled] = useState(false);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const checkCreditsEnabled = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setCreditsEnabled(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .rpc('is_lab_credits_enabled', { _tenant_id: activeTenant.tenant.id });

      if (error) throw error;
      setCreditsEnabled(data || false);
      return data || false;
    } catch (error) {
      console.error("Error checking credits enabled:", error);
      setCreditsEnabled(false);
      return false;
    }
  }, [activeTenant?.tenant.id]);

  const fetchWallet = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setWallet(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_credit_wallets")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id]);

  const fetchTransactions = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setTransactions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("lab_credit_transactions")
        .select(`
          *,
          creator:profiles!lab_credit_transactions_created_by_fkey(id, full_name)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as LabCreditTransaction[]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, [activeTenant?.tenant.id]);

  useEffect(() => {
    const init = async () => {
      const enabled = await checkCreditsEnabled();
      if (enabled) {
        await Promise.all([fetchWallet(), fetchTransactions()]);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [checkCreditsEnabled, fetchWallet, fetchTransactions]);

  const ensureWallet = async (): Promise<LabCreditWallet | null> => {
    if (wallet) return wallet;
    
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lab_credit_wallets")
        .insert({ tenant_id: activeTenant.tenant.id })
        .select()
        .single();

      if (error) throw error;
      setWallet(data);
      return data;
    } catch (error: unknown) {
      console.error("Error creating wallet:", error);
      const message = error instanceof Error ? error.message : "Failed to create wallet";
      toast.error(message);
      return null;
    }
  };

  const purchaseCredits = async (samplesCount: number, note?: string) => {
    if (!user?.id) {
      toast.error("Not authenticated");
      return null;
    }

    const currentWallet = await ensureWallet();
    if (!currentWallet) return null;

    try {
      // Create transaction
      const { error: txnError } = await supabase
        .from("lab_credit_transactions")
        .insert({
          tenant_id: activeTenant?.tenant.id,
          wallet_id: currentWallet.id,
          txn_type: 'purchase',
          samples_count: samplesCount,
          note,
          created_by: user.id,
        });

      if (txnError) throw txnError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("lab_credit_wallets")
        .update({ balance: currentWallet.balance + samplesCount })
        .eq("id", currentWallet.id);

      if (walletError) throw walletError;

      toast.success(`${samplesCount} credits purchased successfully`);
      await Promise.all([fetchWallet(), fetchTransactions()]);
      return true;
    } catch (error: unknown) {
      console.error("Error purchasing credits:", error);
      const message = error instanceof Error ? error.message : "Failed to purchase credits";
      toast.error(message);
      return null;
    }
  };

  const debitCredits = async (sampleId: string, samplesCount: number = 1) => {
    if (!user?.id || !wallet) {
      toast.error("No wallet available");
      return null;
    }

    if (wallet.balance < samplesCount) {
      toast.error("Insufficient credits");
      return null;
    }

    try {
      // Create transaction
      const { data: txn, error: txnError } = await supabase
        .from("lab_credit_transactions")
        .insert({
          tenant_id: activeTenant?.tenant.id,
          wallet_id: wallet.id,
          txn_type: 'debit',
          samples_count: samplesCount,
          sample_ref: sampleId,
          created_by: user.id,
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("lab_credit_wallets")
        .update({ balance: wallet.balance - samplesCount })
        .eq("id", wallet.id);

      if (walletError) throw walletError;

      // Update sample with debit_txn_id
      const { error: sampleError } = await supabase
        .from("lab_samples")
        .update({ debit_txn_id: txn.id })
        .eq("id", sampleId);

      if (sampleError) throw sampleError;

      await Promise.all([fetchWallet(), fetchTransactions()]);
      return txn;
    } catch (error: unknown) {
      console.error("Error debiting credits:", error);
      const message = error instanceof Error ? error.message : "Failed to debit credits";
      toast.error(message);
      return null;
    }
  };

  const refundCredits = async (sampleId: string, samplesCount: number = 1) => {
    if (!user?.id || !wallet) {
      toast.error("No wallet available");
      return null;
    }

    try {
      // Create refund transaction
      const { error: txnError } = await supabase
        .from("lab_credit_transactions")
        .insert({
          tenant_id: activeTenant?.tenant.id,
          wallet_id: wallet.id,
          txn_type: 'refund',
          samples_count: samplesCount,
          sample_ref: sampleId,
          created_by: user.id,
        });

      if (txnError) throw txnError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from("lab_credit_wallets")
        .update({ balance: wallet.balance + samplesCount })
        .eq("id", wallet.id);

      if (walletError) throw walletError;

      // Clear sample debit_txn_id
      const { error: sampleError } = await supabase
        .from("lab_samples")
        .update({ debit_txn_id: null })
        .eq("id", sampleId);

      if (sampleError) throw sampleError;

      toast.success("Credit refunded successfully");
      await Promise.all([fetchWallet(), fetchTransactions()]);
      return true;
    } catch (error: unknown) {
      console.error("Error refunding credits:", error);
      const message = error instanceof Error ? error.message : "Failed to refund credits";
      toast.error(message);
      return null;
    }
  };

  return {
    wallet,
    transactions,
    loading,
    canManage,
    creditsEnabled,
    purchaseCredits,
    debitCredits,
    refundCredits,
    refresh: async () => {
      await Promise.all([fetchWallet(), fetchTransactions()]);
    },
  };
}
