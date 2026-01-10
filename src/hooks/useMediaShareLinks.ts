import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MediaShareLink {
  id: string;
  asset_id: string;
  tenant_id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useMediaShareLinks(assetId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;

  // Fetch share links for an asset
  const { data: shareLinks = [], isLoading } = useQuery({
    queryKey: ["media-share-links", assetId],
    queryFn: async (): Promise<MediaShareLink[]> => {
      if (!assetId || !tenantId) return [];

      const { data, error } = await supabase
        .from("media_share_links" as any)
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching share links:", error);
        return [];
      }
      return (data || []) as unknown as MediaShareLink[];
    },
    enabled: !!assetId && !!tenantId,
  });

  // Create share link
  const createShareLinkMutation = useMutation({
    mutationFn: async ({
      assetId,
      expiresAt,
    }: {
      assetId: string;
      expiresAt?: string;
    }) => {
      if (!tenantId || !user) throw new Error("No tenant or user");

      const { data, error } = await supabase
        .from("media_share_links" as any)
        .insert({
          asset_id: assetId,
          tenant_id: tenantId,
          expires_at: expiresAt || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MediaShareLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["media-share-links"] });
      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/shared/media/${data.token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link created and copied to clipboard");
    },
    onError: (error) => {
      console.error("Create share link error:", error);
      toast.error("Failed to create share link");
    },
  });

  // Revoke share link
  const revokeShareLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("media_share_links" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-share-links"] });
      toast.success("Share link revoked");
    },
    onError: (error) => {
      console.error("Revoke share link error:", error);
      toast.error("Failed to revoke share link");
    },
  });

  // Delete share link
  const deleteShareLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("media_share_links" as any)
        .delete()
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-share-links"] });
      toast.success("Share link deleted");
    },
    onError: (error) => {
      console.error("Delete share link error:", error);
      toast.error("Failed to delete share link");
    },
  });

  const activeLinks = shareLinks.filter(
    (link) => !link.revoked_at && (!link.expires_at || new Date(link.expires_at) > new Date())
  );

  const expiredOrRevokedLinks = shareLinks.filter(
    (link) => link.revoked_at || (link.expires_at && new Date(link.expires_at) <= new Date())
  );

  return {
    shareLinks,
    activeLinks,
    expiredOrRevokedLinks,
    isLoading,

    createShareLink: createShareLinkMutation.mutateAsync,
    revokeShareLink: revokeShareLinkMutation.mutateAsync,
    deleteShareLink: deleteShareLinkMutation.mutateAsync,

    isCreating: createShareLinkMutation.isPending,
    isRevoking: revokeShareLinkMutation.isPending,
    isDeleting: deleteShareLinkMutation.isPending,
  };
}

// Hook to get share info by token (public)
export function useMediaShareInfo(token?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["media-share-info", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.rpc("get_media_share_info", {
        _token: token,
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
    retry: false,
  });

  return {
    shareInfo: data as { bucket: string; path: string; filename: string; mime_type: string } | null,
    isLoading,
    error,
  };
}
