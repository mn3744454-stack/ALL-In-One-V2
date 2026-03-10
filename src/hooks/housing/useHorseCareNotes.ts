import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CareNoteType = 'feed_plan' | 'medication' | 'care_note' | 'restriction' | 'training' | 'vet_note' | 'general';

// Roles considered "internal stable staff" for authorship boundary purposes
const STABLE_INTERNAL_ROLES = ['owner', 'manager', 'staff', 'groom', 'foreman'];

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

// Helper for new tables not yet in generated types
const fromTable = (table: string) => (supabase as any).from(table);

/**
 * Check if a note is externally authored (not by stable staff).
 * Stable users cannot edit/delete externally-authored notes.
 */
function isExternalNote(note: HorseCareNote): boolean {
  if (!note.created_by_role) return false;
  return !STABLE_INTERNAL_ROLES.includes(note.created_by_role);
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

      let query = fromTable('horse_care_notes')
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
      return (data || []) as HorseCareNote[];
    },
    enabled: !!tenantId && !!(horseId || admissionId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCareNoteData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data: note, error } = await fromTable('horse_care_notes')
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

  /**
   * Update a care note — enforces authorship boundaries.
   * Stable staff cannot edit notes authored by external roles (vet, lab, etc.)
   */
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateCareNoteData> & { id: string }) => {
      if (!tenantId) throw new Error('Missing tenant');

      // Fetch the note to check authorship
      const { data: existing } = await fromTable('horse_care_notes')
        .select('created_by, created_by_role')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (!existing) throw new Error('Note not found');

      // Enforce authorship boundary: stable users cannot edit externally-authored notes
      if (isExternalNote(existing as HorseCareNote) && STABLE_INTERNAL_ROLES.includes(activeRole || '')) {
        throw new Error('Cannot edit externally-authored notes');
      }

      const { error } = await fromTable('horse_care_notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note updated');
      queryClient.invalidateQueries({ queryKey: ['horse-care-notes', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update note');
    },
  });

  /**
   * Soft-delete a care note — enforces authorship boundaries.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Missing tenant');

      // Fetch the note to check authorship
      const { data: existing } = await fromTable('horse_care_notes')
        .select('created_by, created_by_role')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (!existing) throw new Error('Note not found');

      // Enforce authorship boundary
      if (isExternalNote(existing as HorseCareNote) && STABLE_INTERNAL_ROLES.includes(activeRole || '')) {
        throw new Error('Cannot delete externally-authored notes');
      }

      const { error } = await fromTable('horse_care_notes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note removed');
      queryClient.invalidateQueries({ queryKey: ['horse-care-notes', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove note');
    },
  });

  const activeNotes = notes.filter((n: HorseCareNote) => n.is_active);

  /**
   * Check if the current user can edit a given note.
   * Returns false for externally-authored notes when the user is stable staff.
   */
  const canEditNote = (note: HorseCareNote): boolean => {
    if (isExternalNote(note) && STABLE_INTERNAL_ROLES.includes(activeRole || '')) {
      return false;
    }
    return true;
  };

  return {
    notes: activeNotes,
    allNotes: notes,
    isLoading,
    createNote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    canEditNote,
    isExternalNote,
  };
}
