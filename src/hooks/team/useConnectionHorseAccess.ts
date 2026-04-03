import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

export interface ConnectionHorseAccess {
  id: string;
  connection_id: string;
  horse_id: string;
  access_level: "read" | "readwrite";
  granted_by: string | null;
  created_at: string;
  horse_name?: string;
  horse_avatar_url?: string | null;
}

export function useConnectionHorseAccess(connectionId: string | null) {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: horseAccess = [], isLoading } = useQuery({
    queryKey: ["connection-horse-access", connectionId],
    queryFn: async (): Promise<ConnectionHorseAccess[]> => {
      if (!connectionId) return [];

      const { data, error } = await supabase
        .from("connection_horse_access")
        .select("id, connection_id, horse_id, access_level, granted_by, created_at")
        .eq("connection_id", connectionId);

      if (error) {
        console.error("Error fetching connection horse access:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Fetch horse names
      const horseIds = data.map(d => d.horse_id);
      const { data: horses } = await supabase
        .from("horses")
        .select("id, name, avatar_url")
        .in("id", horseIds);

      const horseMap = new Map((horses || []).map(h => [h.id, h]));

      return data.map(d => ({
        ...d,
        access_level: d.access_level as "read" | "readwrite",
        horse_name: horseMap.get(d.horse_id)?.name || "",
        horse_avatar_url: horseMap.get(d.horse_id)?.avatar_url || null,
      }));
    },
    enabled: !!connectionId,
  });

  const updateAccess = useMutation({
    mutationFn: async (params: { horseIds: string[]; accessLevel: "read" | "readwrite" }) => {
      if (!connectionId || !user?.id) throw new Error("Missing context");

      // Remove existing
      await supabase
        .from("connection_horse_access")
        .delete()
        .eq("connection_id", connectionId);

      // Insert new
      if (params.horseIds.length > 0) {
        const rows = params.horseIds.map(horseId => ({
          connection_id: connectionId,
          horse_id: horseId,
          access_level: params.accessLevel,
          granted_by: user.id,
        }));
        const { error } = await supabase
          .from("connection_horse_access")
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connection-horse-access", connectionId] });
      toast.success(t("teamPartners.partnerConfig.accessSaved"));
    },
    onError: (err: any) => {
      toast.error(err.message || t("teamPartners.partnerConfig.accessSaveFailed"));
    },
  });

  return { horseAccess, isLoading, updateAccess };
}
