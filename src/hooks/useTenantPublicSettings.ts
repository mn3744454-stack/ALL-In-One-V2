import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "@/hooks/use-toast";

export interface TenantPublicSettings {
  id: string;
  slug: string | null;
  is_public: boolean;
  is_listed: boolean;
  public_name: string | null;
  public_description: string | null;
  public_phone: string | null;
  public_email: string | null;
  public_website: string | null;
  public_location_text: string | null;
  region: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tags: string[] | null;
  name: string; // Original name for fallback
}

export const useTenantPublicSettings = () => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ["tenant-public-settings", tenantId],
    queryFn: async (): Promise<TenantPublicSettings | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select(
          `id, name, slug, is_public, is_listed, public_name, public_description,
           public_phone, public_email, public_website, public_location_text,
           region, logo_url, cover_url, tags`
        )
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data as TenantPublicSettings;
    },
    enabled: !!tenantId,
  });
};

export const useUpdatePublicSettings = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (
      updates: Partial<Omit<TenantPublicSettings, "id" | "name">>
    ) => {
      if (!tenantId) throw new Error("No active tenant");

      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenant-public-settings", tenantId],
      });
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      toast({
        title: "Settings updated",
        description: "Your public profile settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCheckSlugAvailability = () => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (slug: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_slug_available", {
        check_slug: slug,
        exclude_tenant_id: tenantId || null,
      });

      if (error) throw error;
      return data as boolean;
    },
  });
};

export const useGenerateSlug = () => {
  return useMutation({
    mutationFn: async (baseName: string): Promise<string> => {
      const { data, error } = await supabase.rpc("generate_unique_slug", {
        base_name: baseName,
      });

      if (error) throw error;
      return data as string;
    },
  });
};

export const calculateProfileCompleteness = (
  settings: TenantPublicSettings | null
): number => {
  if (!settings) return 0;

  const fields = [
    settings.slug,
    settings.public_name || settings.name,
    settings.public_description,
    settings.public_location_text,
    settings.region,
    settings.public_phone,
    settings.public_email,
    settings.logo_url,
    settings.cover_url,
    settings.tags && settings.tags.length > 0,
  ];

  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
};
