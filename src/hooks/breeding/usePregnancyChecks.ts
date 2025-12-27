import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PregnancyCheck {
  id: string;
  tenant_id: string;
  pregnancy_id: string;
  check_date: string;
  method: "ultrasound" | "palpation" | "blood_test" | "other";
  outcome: "confirmed_pregnant" | "confirmed_open" | "inconclusive";
  notes: string | null;
  created_by: string;
  created_at: string;
  // Joined
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreatePregnancyCheckData {
  pregnancy_id: string;
  check_date: string;
  method: "ultrasound" | "palpation" | "blood_test" | "other";
  outcome: "confirmed_pregnant" | "confirmed_open" | "inconclusive";
  notes?: string | null;
}

export function usePregnancyChecks(pregnancyId?: string) {
  const [checks, setChecks] = useState<PregnancyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchChecks = useCallback(async () => {
    if (!activeTenant?.tenant?.id || !pregnancyId) {
      setChecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pregnancy_checks")
        .select(`
          *,
          creator:profiles!pregnancy_checks_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("pregnancy_id", pregnancyId)
        .order("check_date", { ascending: false });

      if (error) throw error;
      setChecks((data as unknown as PregnancyCheck[]) || []);
    } catch (error) {
      console.error("Error fetching pregnancy checks:", error);
      toast.error("Failed to load pregnancy checks");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, pregnancyId]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const createCheck = async (data: CreatePregnancyCheckData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const { data: newCheck, error } = await supabase
        .from("pregnancy_checks")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Pregnancy check recorded");
      fetchChecks();
      return newCheck;
    } catch (error: any) {
      console.error("Error creating pregnancy check:", error);
      toast.error(error.message || "Failed to record pregnancy check");
      return null;
    }
  };

  return {
    checks,
    loading,
    canManage,
    createCheck,
    refresh: fetchChecks,
  };
}
