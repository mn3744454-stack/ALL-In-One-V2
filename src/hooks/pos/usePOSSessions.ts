import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface POSSession {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  opened_by: string;
  closed_by: string | null;
  status: "open" | "closed" | "reconciled";
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OpenSessionInput {
  tenant_id: string;
  branch_id?: string | null;
  opening_cash: number;
  notes?: string;
}

interface CloseSessionInput {
  session_id: string;
  actual_cash: number;
  notes?: string;
}

export function usePOSSessions(tenantId?: string, branchId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all sessions for tenant
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["pos-sessions", tenantId, branchId],
    queryFn: async (): Promise<POSSession[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("pos_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("opened_at", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching POS sessions:", error);
        return [];
      }

      return data as POSSession[];
    },
    enabled: !!tenantId,
  });

  // Get current open session
  const { data: openSession, isLoading: isLoadingOpen } = useQuery({
    queryKey: ["pos-session-open", tenantId, branchId],
    queryFn: async (): Promise<POSSession | null> => {
      if (!tenantId) return null;

      let query = supabase
        .from("pos_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "open");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      } else {
        query = query.is("branch_id", null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error fetching open session:", error);
        return null;
      }

      return data as POSSession | null;
    },
    enabled: !!tenantId,
  });

  // Open new session
  const openSessionMutation = useMutation({
    mutationFn: async (input: OpenSessionInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("pos_sessions")
        .insert({
          tenant_id: input.tenant_id,
          branch_id: input.branch_id || null,
          opened_by: user.user.id,
          opening_cash: input.opening_cash,
          notes: input.notes || null,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return data as POSSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["pos-session-open", tenantId] });
      toast({ title: "Session opened successfully" });
    },
    onError: (error: Error) => {
      console.error("Error opening session:", error);
      toast({ 
        title: "Failed to open session", 
        description: error.message.includes("ux_pos_sessions_one_open") 
          ? "A session is already open" 
          : error.message,
        variant: "destructive" 
      });
    },
  });

  // Close session
  const closeSessionMutation = useMutation({
    mutationFn: async (input: CloseSessionInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Calculate expected cash from cash invoices in this session
      const { data: cashInvoices, error: invError } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("pos_session_id", input.session_id)
        .eq("payment_method", "cash")
        .not("payment_received_at", "is", null);

      if (invError) throw invError;

      // Get session opening cash
      const { data: session, error: sessError } = await supabase
        .from("pos_sessions")
        .select("opening_cash")
        .eq("id", input.session_id)
        .single();

      if (sessError) throw sessError;

      const cashTotal = (cashInvoices || []).reduce(
        (sum, inv) => sum + (Number(inv.total_amount) || 0), 
        0
      );
      const expectedCash = (Number(session.opening_cash) || 0) + cashTotal;
      const cashVariance = input.actual_cash - expectedCash;

      const { data, error } = await supabase
        .from("pos_sessions")
        .update({
          status: "closed",
          closing_cash: input.actual_cash,
          expected_cash: expectedCash,
          cash_variance: cashVariance,
          closed_by: user.user.id,
          closed_at: new Date().toISOString(),
          notes: input.notes || null,
        })
        .eq("id", input.session_id)
        .select()
        .single();

      if (error) throw error;
      return data as POSSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-sessions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["pos-session-open", tenantId] });
      toast({ title: "Session closed successfully" });
    },
    onError: (error: Error) => {
      console.error("Error closing session:", error);
      toast({ title: "Failed to close session", description: error.message, variant: "destructive" });
    },
  });

  return {
    sessions,
    openSession,
    isLoading: isLoading || isLoadingOpen,
    openNewSession: openSessionMutation.mutateAsync,
    isOpening: openSessionMutation.isPending,
    closeSession: closeSessionMutation.mutateAsync,
    isClosing: closeSessionMutation.isPending,
  };
}
