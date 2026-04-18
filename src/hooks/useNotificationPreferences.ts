import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantNotificationGovernance } from "@/hooks/useTenantNotificationGovernance";
import { useTenantRolePresetBindings } from "@/hooks/useTenantRolePresetBindings";

import {
  applyPreset,
  type FamilyPreferencesMap,
  type PresetId,
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

const HARDCODED_DEFAULTS: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
  push_messages: true,
  push_results: true,
  push_status: true,
  push_invitations: true,
  push_partnerships: true,
  in_app_sound: true,
  quiet_start: null,
  quiet_end: null,
  quiet_timezone: "Asia/Riyadh",
  // Founder/bootstrap default — overridden lazily when a tenant's governance
  // default_preset (or matching role-preset binding) is available.
  preset: "all",
  family_preferences: {},
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { activeRole } = useTenant();
  const queryClient = useQueryClient();
  const queryKey = ["notification_preferences", user?.id];

  const { governance } = useTenantNotificationGovernance();
  const { presetForRole } = useTenantRolePresetBindings();

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

  /**
   * Residual Items 1 + 2 — derive the "first-touch" defaults from the active
   * tenant's governance and any matching role-preset binding. Used both for
   * the in-memory effective prefs (so the bell list filters correctly before
   * the user explicitly saves) and for the auto-INSERT seeding path below.
   *
   * Precedence: role binding → tenant default_preset → hardcoded "all".
   */
  const seededDefaults = (() => {
    const roleBound = presetForRole(activeRole ?? null);
    const seedPreset: PresetId =
      roleBound ?? (governance.default_preset as PresetId) ?? "all";
    const familyMap = applyPreset(seedPreset) ?? {};
    return {
      ...HARDCODED_DEFAULTS,
      preset: seedPreset,
      family_preferences: familyMap,
    };
  })();

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
        // First-touch seed: governance/role-bound preset becomes the row's
        // initial shape. Any explicit `updates` from the caller still win.
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...seededDefaults,
            ...updates,
          } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Merged view: persisted row wins; otherwise governance/role-derived seed.
  const effectivePrefs: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
    ...seededDefaults,
    ...(preferences || {}),
  };

  return {
    preferences: effectivePrefs,
    isLoading,
    updatePreferences: upsertPreferences.mutateAsync,
    isSaving: upsertPreferences.isPending,
  };
}
