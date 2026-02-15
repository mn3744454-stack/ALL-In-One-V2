import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { computeServicePrice, type ServicePricingFields } from "@/lib/pricing/servicePricing";

export interface LabRequestService {
  service_id: string;
  // Phase 13 snapshot fields
  template_ids_snapshot: string[] | null;
  unit_price_snapshot: number | null;
  currency_snapshot: string | null;
  pricing_rule_snapshot: Record<string, unknown> | null;
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
  // Snapshot fields (written by stable at creation time)
  horse_name_snapshot: string | null;
  horse_name_ar_snapshot: string | null;
  horse_snapshot: Record<string, unknown> | null;
  initiator_tenant_name_snapshot: string | null;
  // Joined data
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  // Services linked via join table
  lab_request_services?: LabRequestService[];
  // Initiator tenant (joined in lab full mode)
  initiator_tenant?: {
    id: string;
    name: string;
  };
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
  // Snapshot fields (populated by stable at creation time)
  horse_name_snapshot?: string;
  horse_name_ar_snapshot?: string;
  horse_snapshot?: Record<string, unknown>;
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
      
      // Lab full mode: see incoming requests (lab_tenant_id = us)
      // Stable/requests mode: see own requests (tenant_id = us)
      const filterColumn = isLabFull ? 'lab_tenant_id' : 'tenant_id';
      
      // Build select: always include base + horse + services; lab mode also gets initiator tenant name
      const selectStr = isLabFull
        ? `*, horse:horses(id, name, name_ar), lab_request_services(service_id, template_ids_snapshot, unit_price_snapshot, currency_snapshot, pricing_rule_snapshot, service:lab_services(id, name, name_ar, code, category, price, currency)), initiator_tenant:tenants!lab_requests_tenant_id_fkey(id, name)`
        : `*, horse:horses(id, name, name_ar), lab_request_services(service_id, template_ids_snapshot, unit_price_snapshot, currency_snapshot, pricing_rule_snapshot, service:lab_services(id, name, name_ar, code, category, price, currency))`;
      
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

  const createMutation = useMutation({
    mutationFn: async (data: CreateLabRequestData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');
      
      const { service_ids, initiator_tenant_id, lab_tenant_id, horse_name_snapshot, horse_name_ar_snapshot, horse_snapshot, initiator_tenant_name_snapshot, ...requestData } = data;

      // Step 1: Create the lab_request row
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
          initiator_tenant_id: initiator_tenant_id || tenantId,
          lab_tenant_id: lab_tenant_id || null,
          horse_name_snapshot: horse_name_snapshot || null,
          horse_name_ar_snapshot: horse_name_ar_snapshot || null,
          horse_snapshot: (horse_snapshot || null) as any,
          initiator_tenant_name_snapshot: initiator_tenant_name_snapshot || null,
        } as any)
        .select()
        .single();
      
      if (error) throw error;

      // Step 2: Insert service links with Phase 13 pricing snapshots
      if (service_ids && service_ids.length > 0) {
        // Fetch service pricing details for snapshots
        const { data: serviceDetails } = await supabase
          .from('lab_services')
          .select('id, pricing_mode, override_price, discount_type, discount_value, currency, price')
          .in('id', service_ids);

        const serviceMap = new Map(
          (serviceDetails || []).map(s => [s.id, s as ServicePricingFields])
        );

        const serviceRows = [];
        for (const sid of service_ids) {
          const svc = serviceMap.get(sid);
          let snapshotFields: Record<string, unknown> = {};

          if (svc && tenantId) {
            try {
              const pricing = await computeServicePrice(sid, tenantId, svc);
              // Fetch template IDs linked to this service
              const { data: stMappings } = await supabase
                .from('lab_service_templates')
                .select('template_id')
                .eq('service_id', sid)
                .eq('tenant_id', tenantId);
              
              snapshotFields = {
                template_ids_snapshot: (stMappings || []).map(m => m.template_id),
                unit_price_snapshot: pricing.unitPrice,
                currency_snapshot: pricing.currency,
                pricing_rule_snapshot: pricing.pricingRule,
              };
            } catch (e) {
              console.error('Failed to compute pricing snapshot for service', sid, e);
            }
          }

          serviceRows.push({
            lab_request_id: result.id,
            service_id: sid,
            ...snapshotFields,
          });
        }

        const { error: linkError } = await supabase
          .from('lab_request_services')
          .insert(serviceRows as any);
        
        if (linkError) {
          // Rollback the request if service linking fails
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
    updateRequest: updateMutation.mutateAsync,
    deleteRequest: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
