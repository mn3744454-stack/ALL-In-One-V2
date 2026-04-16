import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { LabRequest } from "./useLabRequests";

/**
 * Phase 6A — Submission Sampling Progress Foundation
 *
 * Computes a coherent sampling-progress object for a single submission:
 *   - total horses in submission
 *   - accepted horses (Phase 5 intake decision)
 *   - sampled horses (have at least one non-cancelled lab_sample linked)
 *   - pending sample creation count (accepted but not yet sampled)
 *   - compact state: 'none' | 'partial' | 'full' | 'idle'
 *
 * "Idle" means: no horses in this submission are in a sampling-ready state
 * (e.g. all rejected, or none accepted yet). UI should hide progress in this case.
 *
 * The hook is intentionally read-only and lightweight so Phase 6B (grouped view)
 * and Phase 6C (inline + batch create) can reuse the same model.
 */

export type SamplingProgressState = "idle" | "none" | "partial" | "full";

export interface SubmissionSamplingProgress {
  submissionId: string;
  totalHorses: number;
  acceptedHorses: number;
  sampledHorses: number;
  pendingSampleCount: number;
  state: SamplingProgressState;
}

/**
 * Pure derivation — exported so Phase 6B/6C can compute progress from already
 * loaded children + sample rows without re-querying.
 */
export function deriveSamplingProgress(
  submissionId: string,
  children: Pick<LabRequest, "id" | "lab_decision">[],
  sampledRequestIds: Set<string>
): SubmissionSamplingProgress {
  const totalHorses = children.length;
  const acceptedChildren = children.filter(
    (c) => (c.lab_decision || "pending_review") === "accepted"
  );
  const acceptedHorses = acceptedChildren.length;
  const sampledHorses = acceptedChildren.filter((c) => sampledRequestIds.has(c.id)).length;
  const pendingSampleCount = Math.max(0, acceptedHorses - sampledHorses);

  let state: SamplingProgressState;
  if (acceptedHorses === 0) state = "idle";
  else if (sampledHorses === 0) state = "none";
  else if (sampledHorses < acceptedHorses) state = "partial";
  else state = "full";

  return {
    submissionId,
    totalHorses,
    acceptedHorses,
    sampledHorses,
    pendingSampleCount,
    state,
  };
}

/**
 * Hook variant — fetches children + linked samples for a single submission.
 * Use this when you do NOT already have the submission children loaded
 * (e.g. from a SampleCard that only knows submission_id).
 */
export function useLabSubmissionSamplingProgress(submissionId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["lab-submission-sampling-progress", tenantId, submissionId],
    queryFn: async (): Promise<SubmissionSamplingProgress | null> => {
      if (!submissionId || !tenantId) return null;

      // 1) child requests in this submission (lab side)
      const { data: children, error: childErr } = await supabase
        .from("lab_requests")
        .select("id, lab_decision")
        .eq("submission_id", submissionId)
        .eq("lab_tenant_id", tenantId);

      if (childErr) throw childErr;
      const childRows = (children || []) as Pick<LabRequest, "id" | "lab_decision">[];

      if (childRows.length === 0) {
        return deriveSamplingProgress(submissionId, [], new Set());
      }

      // 2) samples already linked to any of these child requests (non-cancelled)
      const childIds = childRows.map((c) => c.id);
      const { data: samples, error: sampleErr } = await supabase
        .from("lab_samples")
        .select("lab_request_id, status")
        .eq("tenant_id", tenantId)
        .in("lab_request_id", childIds)
        .neq("status", "cancelled");

      if (sampleErr) throw sampleErr;

      const sampledIds = new Set<string>();
      for (const s of samples || []) {
        if (s.lab_request_id) sampledIds.add(s.lab_request_id);
      }

      return deriveSamplingProgress(submissionId, childRows, sampledIds);
    },
    enabled: !!tenantId && !!submissionId,
    staleTime: 15_000,
  });

  return { progress: data ?? null, loading: isLoading };
}

/**
 * Memo helper for callers that already hold children + samples in memory
 * (e.g. LabSubmissionCard receives `submission.children` and can fetch sample
 * linkage in a single batched query).
 */
export function useDerivedSamplingProgress(
  submissionId: string,
  children: Pick<LabRequest, "id" | "lab_decision">[],
  sampledRequestIds: Set<string>
): SubmissionSamplingProgress {
  return useMemo(
    () => deriveSamplingProgress(submissionId, children, sampledRequestIds),
    [submissionId, children, sampledRequestIds]
  );
}

/**
 * Batch hook — given a list of submission ids, returns a Map of progress objects.
 * Used by LabSubmissionCard list to show "3/5 sampled" on each header without
 * spawning N parallel hooks. Single round-trip.
 */
export function useLabSubmissionsSamplingProgress(
  submissions: { id: string; children: Pick<LabRequest, "id" | "lab_decision">[] }[]
) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const allChildIds = useMemo(
    () => submissions.flatMap((s) => s.children.map((c) => c.id)),
    [submissions]
  );

  const { data: sampledIds, isLoading } = useQuery({
    queryKey: ["lab-submissions-sampling-progress", tenantId, allChildIds.sort().join(",")],
    queryFn: async (): Promise<Set<string>> => {
      if (!tenantId || allChildIds.length === 0) return new Set();
      const { data, error } = await supabase
        .from("lab_samples")
        .select("lab_request_id")
        .eq("tenant_id", tenantId)
        .in("lab_request_id", allChildIds)
        .neq("status", "cancelled");
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data || []) {
        if (row.lab_request_id) set.add(row.lab_request_id);
      }
      return set;
    },
    enabled: !!tenantId,
    staleTime: 15_000,
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, SubmissionSamplingProgress>();
    const ids = sampledIds ?? new Set<string>();
    for (const sub of submissions) {
      map.set(sub.id, deriveSamplingProgress(sub.id, sub.children, ids));
    }
    return map;
  }, [submissions, sampledIds]);

  return { progressMap, sampledRequestIds: sampledIds ?? new Set<string>(), loading: isLoading };
}
