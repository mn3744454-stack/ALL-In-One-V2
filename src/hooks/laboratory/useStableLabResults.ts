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
  sample_id: string | null;
}

/** A group of results belonging to the same sample */
export interface StableResultGroup {
  groupKey: string; // sample_id or request_id fallback
  sampleId: string | null;
  requestId: string | null;
  horseName: string;
  horseId: string | null;
  labName: string;
  publishedAt: string | null;
  physicalSampleId: string | null;
  testDescription: string | null;
  overallStatus: string;
  results: StableLabResult[];
}

/** Groups organized by horse */
export interface StableHorseGroup {
  horseName: string;
  horseId: string | null;
  sampleGroups: StableResultGroup[];
}

interface UseStableLabResultsOptions {
  horseId?: string;
  limit?: number;
  offset?: number;
}

function groupResults(results: StableLabResult[]): StableHorseGroup[] {
  // Group by sample_id (fallback request_id)
  const sampleMap = new Map<string, StableResultGroup>();
  for (const r of results) {
    const key = r.sample_id || r.request_id || r.id;
    if (!sampleMap.has(key)) {
      sampleMap.set(key, {
        groupKey: key,
        sampleId: r.sample_id,
        requestId: r.request_id,
        horseName: r.horse_name_snapshot || r.horse_name || "—",
        horseId: r.horse_id,
        labName: r.lab_tenant_name || "—",
        publishedAt: r.published_at,
        physicalSampleId: r.physical_sample_id,
        testDescription: r.test_description,
        overallStatus: r.status,
        results: [],
      });
    }
    const group = sampleMap.get(key)!;
    group.results.push(r);
    // Use the max published_at
    if (r.published_at && (!group.publishedAt || r.published_at > group.publishedAt)) {
      group.publishedAt = r.published_at;
    }
    // Overall status: final > reviewed > draft
    const statusRank: Record<string, number> = { draft: 0, reviewed: 1, final: 2 };
    if ((statusRank[r.status] ?? 0) > (statusRank[group.overallStatus] ?? 0)) {
      group.overallStatus = r.status;
    }
  }

  // Group sample groups by horse
  const horseMap = new Map<string, StableHorseGroup>();
  for (const sg of sampleMap.values()) {
    const horseKey = sg.horseId || sg.horseName;
    if (!horseMap.has(horseKey)) {
      horseMap.set(horseKey, {
        horseName: sg.horseName,
        horseId: sg.horseId,
        sampleGroups: [],
      });
    }
    horseMap.get(horseKey)!.sampleGroups.push(sg);
  }

  // Sort horse groups by most recent publish
  return Array.from(horseMap.values()).sort((a, b) => {
    const aDate = a.sampleGroups[0]?.publishedAt || "";
    const bDate = b.sampleGroups[0]?.publishedAt || "";
    return bDate.localeCompare(aDate);
  });
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

  const horseGroups = groupResults(results);

  return { results, horseGroups, loading, refresh: fetchResults };
}
