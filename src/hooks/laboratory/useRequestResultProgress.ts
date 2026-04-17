import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Phase 7 — Per-template result state inside a single request.
 * Drives the Lab-side "Results owed" panel and the Stable-side
 * per-template publish pills.
 */
export type TemplateResultState =
  | "no_result"
  | "draft"
  | "reviewed"
  | "final"
  | "published";

export interface RequestTemplateProgress {
  lrst_id: string;
  service_id: string;
  service_name: string | null;
  service_name_ar: string | null;
  template_id: string | null;
  template_name: string | null;
  template_name_ar: string | null;
  template_decision: "pending" | "accepted" | "rejected";
  result_id: string | null;
  result_status: "draft" | "reviewed" | "final" | null;
  published_to_stable: boolean;
  state: TemplateResultState | "refused" | "pending_decision";
  sort_order: number;
}

export interface RequestResultProgress {
  acceptedCount: number;
  resultsCount: number;
  finalCount: number;
  publishedCount: number;
  templates: RequestTemplateProgress[];
}

export function useRequestResultProgress(requestId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ["request_result_progress", requestId, tenantId],
    enabled: !!requestId && !!tenantId,
    queryFn: async (): Promise<RequestResultProgress> => {
      // 1) Pull all template-decision rows for this request
      const { data: lrstRows, error: lrstErr } = await supabase
        .from("lab_request_service_templates")
        .select(`
          id,
          service_id,
          template_id,
          template_name_snapshot,
          template_name_ar_snapshot,
          template_decision,
          sort_order_snapshot,
          lab_request_services!inner(
            service_id,
            service_name_snapshot,
            service_name_ar_snapshot
          )
        `)
        .eq("lab_request_id", requestId!)
        .order("sort_order_snapshot", { ascending: true });

      if (lrstErr) throw lrstErr;

      // 2) Pull all results that may match (via samples linked to the request)
      const { data: sampleRows } = await supabase
        .from("lab_samples")
        .select("id")
        .eq("lab_request_id", requestId!);
      const sampleIds = (sampleRows || []).map((s) => s.id);

      let resultsRows: Array<{
        id: string;
        template_id: string;
        sample_id: string;
        status: string;
        published_to_stable: boolean;
      }> = [];
      if (sampleIds.length > 0) {
        const { data, error: rErr } = await supabase
          .from("lab_results")
          .select("id, template_id, sample_id, status, published_to_stable")
          .in("sample_id", sampleIds);
        if (rErr) throw rErr;
        resultsRows = (data || []) as typeof resultsRows;
      }

      const resultByTemplate = new Map<string, typeof resultsRows[0]>();
      for (const r of resultsRows) {
        // Take the most-progressed result per template
        const existing = resultByTemplate.get(r.template_id);
        if (
          !existing ||
          rankResultStatus(r.status, r.published_to_stable) >
            rankResultStatus(existing.status, existing.published_to_stable)
        ) {
          resultByTemplate.set(r.template_id, r);
        }
      }

      const templates: RequestTemplateProgress[] = (lrstRows || []).map((row) => {
        const svc = (row as any).lab_request_services as {
          service_id: string;
          service_name_snapshot: string | null;
          service_name_ar_snapshot: string | null;
        };
        const matchedResult = row.template_id
          ? resultByTemplate.get(row.template_id)
          : undefined;
        const decision = (row.template_decision || "pending") as
          | "pending"
          | "accepted"
          | "rejected";

        let state: RequestTemplateProgress["state"];
        if (decision === "rejected") state = "refused";
        else if (decision === "pending") state = "pending_decision";
        else if (!matchedResult) state = "no_result";
        else if (matchedResult.published_to_stable) state = "published";
        else if (matchedResult.status === "final") state = "final";
        else if (matchedResult.status === "reviewed") state = "reviewed";
        else state = "draft";

        return {
          lrst_id: row.id,
          service_id: svc?.service_id ?? row.service_id,
          service_name: svc?.service_name_snapshot ?? null,
          service_name_ar: svc?.service_name_ar_snapshot ?? null,
          template_id: row.template_id,
          template_name: row.template_name_snapshot,
          template_name_ar: row.template_name_ar_snapshot,
          template_decision: decision,
          result_id: matchedResult?.id ?? null,
          result_status:
            (matchedResult?.status as "draft" | "reviewed" | "final" | null) ??
            null,
          published_to_stable: matchedResult?.published_to_stable ?? false,
          state,
          sort_order: row.sort_order_snapshot ?? 0,
        };
      });

      const accepted = templates.filter((t) => t.template_decision === "accepted");
      const acceptedCount = accepted.length;
      const resultsCount = accepted.filter((t) => !!t.result_id).length;
      const finalCount = accepted.filter(
        (t) => t.result_status === "final" || t.published_to_stable
      ).length;
      const publishedCount = accepted.filter((t) => t.published_to_stable).length;

      return {
        acceptedCount,
        resultsCount,
        finalCount,
        publishedCount,
        templates,
      };
    },
  });
}

function rankResultStatus(status: string, published: boolean): number {
  if (published) return 4;
  if (status === "final") return 3;
  if (status === "reviewed") return 2;
  if (status === "draft") return 1;
  return 0;
}

/**
 * Phase 7 — Aggregate progress for a whole submission (sum of children).
 * Lightweight: relies on useRequestResultProgress per child; consumers usually
 * already have the requestIds list from useLabSubmissions.
 */
export function useSubmissionResultProgress(requestIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;
  const [data, setData] = useState<{
    acceptedCount: number;
    publishedCount: number;
    resultsCount: number;
  }>({ acceptedCount: 0, publishedCount: 0, resultsCount: 0 });
  const [loading, setLoading] = useState(false);

  const fetchAgg = useCallback(async () => {
    if (!tenantId || requestIds.length === 0) {
      setData({ acceptedCount: 0, publishedCount: 0, resultsCount: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("vw_lab_result_progress")
        .select("accepted_templates_count, results_count, published_results_count")
        .in("lab_request_id", requestIds)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const agg = (rows || []).reduce(
        (acc, r: any) => ({
          acceptedCount: acc.acceptedCount + (r.accepted_templates_count || 0),
          publishedCount:
            acc.publishedCount + (r.published_results_count || 0),
          resultsCount: acc.resultsCount + (r.results_count || 0),
        }),
        { acceptedCount: 0, publishedCount: 0, resultsCount: 0 }
      );
      setData(agg);
    } finally {
      setLoading(false);
    }
  }, [tenantId, requestIds.join(",")]);

  useEffect(() => {
    fetchAgg();
  }, [fetchAgg]);

  return { ...data, loading, refresh: fetchAgg };
}
