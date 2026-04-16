import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import type { LabRequest } from "./useLabRequests";

export interface LabSubmission {
  id: string;
  tenant_id: string;
  initiator_tenant_id: string;
  lab_tenant_id: string | null;
  external_lab_name: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  description: string | null;
  status: string;
  expected_by: string | null;
  requested_at: string;
  created_by: string;
  initiator_tenant_name_snapshot: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  // Phase 5 — derived parent decision (system-managed via DB trigger)
  lab_decision?: 'pending_review' | 'accepted' | 'rejected' | 'partial';
  // Populated by join
  children: LabRequest[];
}

/**
 * Fetches lab_submissions with their child lab_requests for Lab-full mode.
 * Also returns orphan requests (no submission_id) for backward compat.
 */
export function useLabSubmissions() {
  const { activeTenant } = useTenant();
  const { labMode } = useModuleAccess();
  const tenantId = activeTenant?.tenant?.id;
  const isLabFull = labMode === 'full';

  const { data, isLoading, error } = useQuery({
    queryKey: ['lab-submissions', tenantId],
    queryFn: async () => {
      if (!tenantId) return { submissions: [], orphanRequests: [] };

      // 1) Fetch submissions targeted at this lab
      const { data: subs, error: subErr } = await supabase
        .from('lab_submissions')
        .select('*')
        .eq('lab_tenant_id', tenantId)
        .order('requested_at', { ascending: false });

      if (subErr) throw subErr;

      // 2) Fetch all lab_requests for this lab
      const { data: allRequests, error: reqErr } = await supabase
        .from('lab_requests')
        .select(`*, horse:horses(id, name, name_ar), lab_request_services(service_id, template_ids_snapshot, unit_price_snapshot, currency_snapshot, pricing_rule_snapshot, service_name_snapshot, service_name_ar_snapshot, service_code_snapshot, service:lab_services(id, name, name_ar, code, category, price, currency)), initiator_tenant:tenants!lab_requests_initiator_tenant_id_fkey(id, name)`)
        .eq('lab_tenant_id', tenantId)
        .order('requested_at', { ascending: false });

      if (reqErr) throw reqErr;

      const requests = (allRequests || []) as unknown as LabRequest[];

      // 3) Group children by submission_id
      const childrenBySubmission = new Map<string, LabRequest[]>();
      const orphans: LabRequest[] = [];

      for (const req of requests) {
        if (req.submission_id) {
          const list = childrenBySubmission.get(req.submission_id) || [];
          list.push(req);
          childrenBySubmission.set(req.submission_id, list);
        } else {
          orphans.push(req);
        }
      }

      // 4) Assemble submissions with children
      const submissions: LabSubmission[] = (subs || []).map((s: any) => ({
        ...s,
        children: childrenBySubmission.get(s.id) || [],
      }));

      return { submissions, orphanRequests: orphans };
    },
    enabled: !!tenantId && isLabFull,
  });

  return {
    submissions: data?.submissions || [],
    orphanRequests: data?.orphanRequests || [],
    loading: isLoading,
    error,
  };
}

/**
 * Derive aggregate status from child statuses.
 * Phase 6B.1 — now factors in `lab_decision` (Phase 5 intake truth) so the
 * outer grouped badge no longer misrepresents cancelled/rejected child reality
 * as a generic "pending" state.
 */
export function deriveSubmissionStatus(children: LabRequest[]): {
  label: 'pending' | 'processing' | 'partial' | 'ready' | 'received' | 'cancelled' | 'rejected' | 'mixed';
  color: string;
  divergence?: { rejected: number; cancelled: number };
} {
  if (children.length === 0) return { label: 'pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };

  // Phase 6B.1 — Decision-aware aggregation (runs before legacy status logic)
  const decisions = children.map(c => (c.lab_decision || 'pending_review'));
  const cancelledCount = children.filter(c => c.status === 'cancelled').length;
  const rejectedCount = decisions.filter(d => d === 'rejected').length;
  const acceptedCount = decisions.filter(d => d === 'accepted').length;
  const pendingReviewCount = decisions.filter(d => d === 'pending_review').length;

  // All children rejected at intake
  if (rejectedCount === children.length) {
    return { label: 'rejected', color: 'bg-red-100 text-red-800 border-red-200' };
  }
  // All children cancelled (transport-level)
  if (cancelledCount === children.length) {
    return { label: 'cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
  // All children either rejected or cancelled (no live work remains)
  if (rejectedCount + cancelledCount === children.length) {
    return {
      label: 'cancelled',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      divergence: { rejected: rejectedCount, cancelled: cancelledCount - rejectedCount > 0 ? cancelledCount - 0 : cancelledCount },
    };
  }

  const divergence = (rejectedCount > 0 || cancelledCount > 0)
    ? { rejected: rejectedCount, cancelled: cancelledCount }
    : undefined;

  // Live (non-cancelled, non-rejected) children only — drive the visible state
  const liveChildren = children.filter(
    c => c.status !== 'cancelled' && (c.lab_decision || 'pending_review') !== 'rejected'
  );

  if (liveChildren.length === 0) {
    return { label: 'cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', divergence };
  }

  const statuses = liveChildren.map(c => c.status);
  const allSame = statuses.every(s => s === statuses[0]);

  if (allSame) {
    const s = statuses[0];
    if (s === 'ready') return { label: 'ready', color: 'bg-green-100 text-green-800 border-green-200', divergence };
    if (s === 'received') return { label: 'received', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', divergence };
    if (s === 'processing') return { label: 'processing', color: 'bg-purple-100 text-purple-800 border-purple-200', divergence };
    if (s === 'sent') return { label: 'processing', color: 'bg-blue-100 text-blue-800 border-blue-200', divergence };
    return { label: 'pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', divergence };
  }

  const hasActive = statuses.some(s => s === 'processing' || s === 'sent');
  const hasReady = statuses.some(s => s === 'ready' || s === 'received');
  if (hasActive || hasReady) return { label: 'partial', color: 'bg-blue-100 text-blue-800 border-blue-200', divergence };

  return { label: 'pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', divergence };
}
