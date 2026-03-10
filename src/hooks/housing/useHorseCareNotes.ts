import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CareNoteType = 'feed_plan' | 'medication' | 'care_note' | 'restriction' | 'training' | 'vet_note' | 'general';

export interface HorseCareNote {
  id: string;
  tenant_id: string;
  horse_id: string;
  admission_id: string | null;
  note_type: CareNoteType;
  title: string | null;
  body: string;
  priority: string;
  valid_from: string | null;
  valid_until: string | null;
  created_by: string | null;
  created_by_role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_profile?: { id: string; full_name: string | null };
}

export interface CreateCareNoteData {
  horse_id: string;
  admission_id?: string | null;
  note_type: CareNoteType;
  title?: string;
  body: string;
  priority?: string;
  valid_from?: string | null;
  valid_until?: string | null;
}

export function useHorseCareNotes(horseId?: string | null, admissionId?: string | null) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;
  const activeRole = activeTenant?.role;

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['horse-care-notes', tenantId, horseId, admissionId],
    queryFn: async (): Promise<HorseCareNote[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from('horse_care_notes')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (horseId) query = query.eq('horse_id', horseId);
      if (admissionId) query = query.eq('admission_id', admissionId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as HorseCareNote[];
    },
    enabled: !!tenantId && !!(horseId || admissionId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCareNoteData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data: note, error } = await supabase
        .from('horse_care_notes')
        .insert({
          tenant_id: tenantId,
          horse_id: data.horse_id,
          admission_id: data.admission_id || null,
          note_type: data.note_type,
          title: data.title || null,
          body: data.body,
          priority: data.priority || 'normal',
          valid_from: data.valid_from || null,
          valid_until: data.valid_until || null,
          created_by: user.id,
          created_by_role: activeRole || null,
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['horse-care-notes', tenantId] });
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateCareNoteData> & { id: string }) => {
      if (!tenantId) throw new Error('Missing tenant');

      const { error } = await supabase
        .from('horse_care_notes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note updated');
      queryClient.invalidateQueries({ queryKey: ['horse-care-notes', tenantId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Missing tenant');

      const { error } = await supabase
        .from('horse_care_notes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note removed');
      queryClient.invalidateQueries({ queryKey: ['horse-care-notes', tenantId] });
    },
  });

  const activeNotes = notes.filter(n => n.is_active);

  return {
    notes: activeNotes,
    allNotes: notes,
    isLoading,
    createNote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
  };
}
