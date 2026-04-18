import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import type {
  FamilyPreferencesMap,
  PresetId,
} from "@/lib/notifications/presets";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_messages: boolean;
  push_results: boolean;
  push_status: boolean;
  push_invitations: boolean;
  push_partnerships: boolean;
  in_app_sound: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  quiet_timezone: string;
  /** Phase 3 — personal preset starting point. */
  preset: PresetId;
  /** Phase 3 — per-family delivery levels. */
  family_preferences: FamilyPreferencesMap;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFS: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
  push_messages: true,
  push_results: true,
  push_status: true,
  push_invitations: true,
  push_partnerships: true,
  in_app_sound: true,
  quiet_start: null,
  quiet_end: null,
  quiet_timezone: "Asia/Riyadh",
  // Phase 3 founder/bootstrap default: everything on, no per-family overrides.
  preset: "all",
  family_preferences: {},
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["notification_preferences", user?.id];

  const { data: preferences, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as NotificationPreferences | null;
    },
    enabled: !!user?.id,
  });

  const upsertPreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates as never)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id, ...DEFAULT_PREFS, ...updates } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Merged view: DB row or defaults
  const effectivePrefs: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
    ...DEFAULT_PREFS,
    ...(preferences || {}),
  };

  return {
    preferences: effectivePrefs,
    isLoading,
    updatePreferences: upsertPreferences.mutateAsync,
    isSaving: upsertPreferences.isPending,
  };
}
