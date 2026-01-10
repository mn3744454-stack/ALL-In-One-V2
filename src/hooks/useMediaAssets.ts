import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaAsset {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  bucket: string;
  path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: "private" | "tenant" | "shared_link";
  created_by: string | null;
  created_at: string;
  display_order: number;
  alt_text: string | null;
}

interface UseMediaAssetsParams {
  tenantId?: string;
  entityType?: string;
  entityId?: string;
}

export function useMediaAssets({ tenantId, entityType, entityId }: UseMediaAssetsParams) {
  const queryClient = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["media-assets", tenantId, entityType, entityId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("media_assets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching media assets:", error);
        return [];
      }

      return (data || []) as MediaAsset[];
    },
    enabled: !!tenantId,
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) throw new Error("Asset not found");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(asset.bucket)
        .remove([asset.path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets", tenantId] });
      toast.success("File deleted");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    },
  });

  return {
    assets,
    isLoading,
    deleteAsset: deleteAssetMutation.mutateAsync,
    isDeleting: deleteAssetMutation.isPending,
  };
}
