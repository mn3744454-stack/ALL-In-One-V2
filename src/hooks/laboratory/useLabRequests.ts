import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";

export interface LabRequestService {
  service_id: string;
  template_ids_snapshot: string[] | null;
  unit_price_snapshot: number | null;
  currency_snapshot: string | null;
  pricing_rule_snapshot: Record<string, unknown> | null;
  service_name_snapshot: string | null;
  service_name_ar_snapshot: string | null;
  service_code_snapshot: string | null;
  service?: {
    id: string;
    name: string;
    name_ar: string | null;
    code: string | null;
    category: string | null;
    price: number | null;
    currency: string | null;
  };
}

export interface LabRequest {
  id: string;
  tenant_id: string;
  horse_id: string;
  external_lab_name: string | null;
  external_lab_id: string | null;
  status: 'pending' | 'sent' | 'processing' | 'ready' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  test_description: string;
  notes: string | null;
  requested_at: string;
  expected_by: string | null;
  received_at: string | null;
  result_share_token: string | null;
  result_url: string | null;
  result_file_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_demo: boolean;
  initiator_tenant_id: string | null;
  lab_tenant_id: string | null;
  submission_id: string | null;
  horse_name_snapshot: string | null;
  horse_name_ar_snapshot: string | null;
  horse_snapshot: Record<string, unknown> | null;
  initiator_tenant_name_snapshot: string | null;
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  lab_request_services?: LabRequestService[];
  initiator_tenant?: {
    id: string;
    name: string;
  };
  // Phase 5 — intake decision fields
  lab_decision?: 'pending_review' | 'accepted' | 'rejected';
  rejection_reason?: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  specimen_received_at?: string | null;
  specimen_received_by?: string | null;
}

export interface CreateLabRequestData {
  horse_id: string;
  test_description: string;
  external_lab_name?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  expected_by?: string;
  service_ids?: string[];
  initiator_tenant_id?: string;
  lab_tenant_id?: string;
  horse_name_snapshot?: string;
  horse_name_ar_snapshot?: string;
  horse_snapshot?: Record<string, unknown>;
  initiator_tenant_name_snapshot?: string;
}

/** Data for creating a parent submission + N child requests */
export interface CreateSubmissionData {
  horses: Array<{
    horse_id: string;
    test_description: string;
    service_ids?: string[];
    horse_name_snapshot?: string;
    horse_name_ar_snapshot?: string | null;
    horse_snapshot?: Record<string, unknown>;
  }>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  description?: string;
  expected_by?: string;
  initiator_tenant_id?: string;
  lab_tenant_id?: string;
  external_lab_name?: string;
  initiator_tenant_name_snapshot?: string;
}

export interface UpdateLabRequestData {
  status?: LabRequest['status'];
  notes?: string;
  received_at?: string;
  result_share_token?: string;
  result_url?: string;
}

export function useLabRequests() {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { labMode } = useModuleAccess();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;
  const isLabFull = labMode === 'full';

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.labRequests(tenantId, labMode),
    queryFn: async () => {
      if (!tenantId) return [];
      
      const filterColumn = isLabFull ? 'lab_tenant_id' : 'tenant_id';
      
      const selectStr = isLabFull
        ? `*, horse:horses(id, name, name_ar), lab_request_services(service_id, template_ids_snapshot, unit_price_snapshot, currency_snapshot, pricing_rule_snapshot, service_name_snapshot, service_name_ar_snapshot, service_code_snapshot, service:lab_services(id, name, name_ar, code, category, price, currency)), initiator_tenant:tenants!lab_requests_initiator_tenant_id_fkey(id, name)`
        : `*, horse:horses(id, name, name_ar), lab_request_services(service_id, template_ids_snapshot, unit_price_snapshot, currency_snapshot, pricing_rule_snapshot, service_name_snapshot, service_name_ar_snapshot, service_code_snapshot, service:lab_services(id, name, name_ar, code, category, price, currency))`;
      
      const { data, error } = await supabase
        .from('lab_requests')
        .select(selectStr)
        .eq(filterColumn, tenantId)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return (data as unknown) as LabRequest[];
    },
    enabled: !!tenantId,
  });

  // Legacy single-request creation (kept for backward compatibility)
  const createMutation = useMutation({
    mutationFn: async (data: CreateLabRequestData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');
      
      const { service_ids, initiator_tenant_id, lab_tenant_id, horse_name_snapshot, horse_name_ar_snapshot, horse_snapshot, initiator_tenant_name_snapshot, ...requestData } = data;

      let resolvedHorseName = horse_name_snapshot || null;
      let resolvedHorseNameAr = horse_name_ar_snapshot || null;
      let resolvedHorseSnapshot = horse_snapshot || null;
      let resolvedTenantName = initiator_tenant_name_snapshot || null;

      if (!resolvedHorseName && requestData.horse_id) {
        const { data: horseData } = await supabase
          .from('horses')
          .select('name, name_ar, breed, color')
          .eq('id', requestData.horse_id)
          .single();
        if (horseData) {
          resolvedHorseName = horseData.name;
          resolvedHorseNameAr = horseData.name_ar || null;
          resolvedHorseSnapshot = {
            breed: (horseData as any).breed || undefined,
            color: (horseData as any).color || undefined,
          };
        }
      }

      const effectiveInitiatorId = initiator_tenant_id || tenantId;
      if (!resolvedTenantName && effectiveInitiatorId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', effectiveInitiatorId)
          .single();
        if (tenantData) {
          resolvedTenantName = tenantData.name;
        }
      }

      const { data: result, error } = await supabase
        .from('lab_requests')
        .insert({
          tenant_id: tenantId,
          horse_id: requestData.horse_id,
          test_description: requestData.test_description,
          external_lab_name: requestData.external_lab_name || null,
          priority: requestData.priority || 'normal',
          notes: requestData.notes || null,
          expected_by: requestData.expected_by || null,
          created_by: user.id,
          initiator_tenant_id: effectiveInitiatorId,
          lab_tenant_id: lab_tenant_id || null,
          horse_name_snapshot: resolvedHorseName,
          horse_name_ar_snapshot: resolvedHorseNameAr,
          horse_snapshot: (resolvedHorseSnapshot || null) as any,
          initiator_tenant_name_snapshot: resolvedTenantName,
        } as any)
        .select()
        .single();
      
      if (error) throw error;

      if (service_ids && service_ids.length > 0) {
        const serviceRows = service_ids.map(sid => ({
          lab_request_id: result.id,
          service_id: sid,
        }));

        const { error: linkError } = await supabase
          .from('lab_request_services')
          .insert(serviceRows as any);
        
        if (linkError) {
          await supabase.from('lab_requests').delete().eq('id', result.id);
          throw linkError;
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId, labMode) });
      toast.success(t('laboratory.requests.created') || 'Lab request created');
    },
    onError: (error) => {
      console.error('Failed to create lab request:', error);
      toast.error(t('laboratory.requests.createFailed') || 'Failed to create lab request');
    },
  });

  /**
   * Phase 1: Create a parent submission + N child horse requests in one flow.
   * Creates lab_submissions row first, then lab_requests children with submission_id.
   */
  const createSubmissionMutation = useMutation({
    mutationFn: async (data: CreateSubmissionData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const effectiveInitiatorId = data.initiator_tenant_id || tenantId;

      // Resolve tenant name snapshot if not provided
      let tenantNameSnapshot = data.initiator_tenant_name_snapshot || null;
      if (!tenantNameSnapshot && effectiveInitiatorId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', effectiveInitiatorId)
          .single();
        if (tenantData) tenantNameSnapshot = tenantData.name;
      }

      // 1) Create parent submission
      const { data: submission, error: subError } = await supabase
        .from('lab_submissions')
        .insert({
          tenant_id: tenantId,
          initiator_tenant_id: effectiveInitiatorId,
          lab_tenant_id: data.lab_tenant_id || null,
          external_lab_name: data.external_lab_name || null,
          priority: data.priority || 'normal',
          notes: data.notes || null,
          description: data.description || null,
          status: 'pending',
          expected_by: data.expected_by || null,
          created_by: user.id,
          initiator_tenant_name_snapshot: tenantNameSnapshot,
        })
        .select()
        .single();

      if (subError) throw subError;

      // 2) Create child requests per horse
      const childResults: any[] = [];
      for (const horse of data.horses) {
        // Resolve horse snapshots if not provided
        let horseName = horse.horse_name_snapshot || null;
        let horseNameAr = horse.horse_name_ar_snapshot || null;
        let horseSnapshot = horse.horse_snapshot || null;

        if (!horseName && horse.horse_id) {
          const { data: horseData } = await supabase
            .from('horses')
            .select('name, name_ar, breed, color')
            .eq('id', horse.horse_id)
            .single();
          if (horseData) {
            horseName = horseData.name;
            horseNameAr = horseData.name_ar || null;
            horseSnapshot = {
              breed: (horseData as any).breed || undefined,
              color: (horseData as any).color || undefined,
            };
          }
        }

        const { data: childReq, error: childError } = await supabase
          .from('lab_requests')
          .insert({
            tenant_id: tenantId,
            horse_id: horse.horse_id,
            test_description: horse.test_description,
            priority: data.priority || 'normal',
            notes: data.notes || null,
            expected_by: data.expected_by || null,
            created_by: user.id,
            initiator_tenant_id: effectiveInitiatorId,
            lab_tenant_id: data.lab_tenant_id || null,
            external_lab_name: data.external_lab_name || null,
            submission_id: submission.id,
            horse_name_snapshot: horseName,
            horse_name_ar_snapshot: horseNameAr,
            horse_snapshot: (horseSnapshot || null) as any,
            initiator_tenant_name_snapshot: tenantNameSnapshot,
          } as any)
          .select()
          .single();

        if (childError) {
          console.error('Failed to create child request for horse', horse.horse_id, childError);
          continue; // Continue creating other children
        }

        childResults.push(childReq);

        // Link services to child request
        if (horse.service_ids && horse.service_ids.length > 0) {
          const serviceRows = horse.service_ids.map(sid => ({
            lab_request_id: childReq.id,
            service_id: sid,
          }));
          const { error: svcError } = await supabase
            .from('lab_request_services')
            .insert(serviceRows as any);
          if (svcError) {
            console.error('Failed to link services for request', childReq.id, svcError);
          }
        }
      }

      if (childResults.length === 0) {
        // No children created — clean up the parent
        await supabase.from('lab_submissions').delete().eq('id', submission.id);
        throw new Error('Failed to create any child requests');
      }

      return { submission, children: childResults };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId, labMode) });
      queryClient.invalidateQueries({ queryKey: ['lab-submissions'] });
      // Toast is handled by the caller for batch awareness
    },
    onError: (error) => {
      console.error('Failed to create submission:', error);
      toast.error(t('laboratory.requests.createFailed') || 'Failed to create lab request');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLabRequestData & { id: string }) => {
      const { data, error } = await supabase
        .from('lab_requests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId, labMode) });
      toast.success(t('laboratory.requests.updated') || 'Lab request updated');
    },
    onError: (error) => {
      console.error('Failed to update lab request:', error);
      toast.error(t('laboratory.requests.updateFailed') || 'Failed to update lab request');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lab_requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId, labMode) });
      toast.success(t('laboratory.requests.deleted') || 'Lab request deleted');
    },
    onError: (error) => {
      console.error('Failed to delete lab request:', error);
      toast.error(t('laboratory.requests.deleteFailed') || 'Failed to delete lab request');
    },
  });

  return {
    requests,
    loading: isLoading,
    error,
    refetch,
    createRequest: createMutation.mutateAsync,
    createSubmission: createSubmissionMutation.mutateAsync,
    updateRequest: updateMutation.mutateAsync,
    deleteRequest: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending || createSubmissionMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
