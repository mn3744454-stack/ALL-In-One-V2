import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";

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
  // Joined data
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
}

export interface CreateLabRequestData {
  horse_id: string;
  test_description: string;
  external_lab_name?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  expected_by?: string;
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
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.labRequests(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('lab_requests')
        .select(`
          *,
          horse:horses(id, name, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data as LabRequest[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateLabRequestData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');
      
      const { data: result, error } = await supabase
        .from('lab_requests')
        .insert({
          tenant_id: tenantId,
          horse_id: data.horse_id,
          test_description: data.test_description,
          external_lab_name: data.external_lab_name || null,
          priority: data.priority || 'normal',
          notes: data.notes || null,
          expected_by: data.expected_by || null,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId) });
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
