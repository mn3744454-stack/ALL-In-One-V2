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

  // Note: media_assets table needs to be created via migration
  // Using rpc or raw query pattern for tables not yet in generated types
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["media-assets", tenantId, entityType, entityId],
    queryFn: async (): Promise<MediaAsset[]> => {
      if (!tenantId) return [];

      // Build filter conditions
      const filters: string[] = [`tenant_id.eq.${tenantId}`];
      if (entityType) filters.push(`entity_type.eq.${entityType}`);
      if (entityId) filters.push(`entity_id.eq.${entityId}`);

      const { data, error } = await supabase
        .from("media_assets" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        // Table might not exist yet
        if (error.code === "42P01") {
          console.warn("media_assets table does not exist yet");
          return [];
        }
        console.error("Error fetching media assets:", error);
        return [];
      }

      // Apply additional filters manually if needed
      let result = (data || []) as unknown as MediaAsset[];
      if (entityType) {
        result = result.filter(a => a.entity_type === entityType);
      }
      if (entityId) {
        result = result.filter(a => a.entity_id === entityId);
      }

      return result;
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

      // Delete from database using type assertion
      const { error } = await supabase
        .from("media_assets" as any)
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
