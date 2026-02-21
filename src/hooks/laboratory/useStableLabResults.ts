import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { tGlobal } from "@/i18n";

export interface StableLabResult {
  id: string;
  status: string;
  flags: string | null;
  result_data: Record<string, unknown> | null;
  interpretation: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
  template_id: string | null;
  template_name: string | null;
  template_name_ar: string | null;
  physical_sample_id: string | null;
  horse_name: string | null;
  request_id: string | null;
  test_description: string | null;
  horse_id: string | null;
  horse_name_snapshot: string | null;
  horse_name_ar_snapshot: string | null;
  lab_tenant_id: string | null;
  lab_tenant_name: string | null;
}

interface UseStableLabResultsOptions {
  horseId?: string;
  limit?: number;
  offset?: number;
}

export function useStableLabResults(options: UseStableLabResultsOptions = {}) {
  const [results, setResults] = useState<StableLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();

  const fetchResults = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_stable_lab_results", {
        _stable_tenant_id: activeTenant.tenant.id,
        _horse_id: options.horseId || null,
        _limit: options.limit || 50,
        _offset: options.offset || 0,
      });

      if (error) {
        if (error.message?.includes("no_access")) {
          setResults([]);
          return;
        }
        throw error;
      }

      setResults((data as unknown as StableLabResult[]) || []);
    } catch (error) {
      console.error("Error fetching stable lab results:", error);
      toast.error(tGlobal("laboratory.toasts.failedToLoadResults"));
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, options.horseId, options.limit, options.offset]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, loading, refresh: fetchResults };
}
