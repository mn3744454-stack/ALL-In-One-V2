import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTenantDetail {
  id: string;
  slug: string;
  type: string;
  display_name: string;
  public_description: string | null;
  public_phone: string | null;
  public_email: string | null;
  public_website: string | null;
  public_location_text: string | null;
  region: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tags: string[] | null;
  created_at: string;
}

export const usePublicTenant = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["public-tenant", slug],
    queryFn: async (): Promise<PublicTenantDetail | null> => {
      if (!slug) return null;

      // Use the RPC function to get public tenant
      const { data, error } = await supabase.rpc("get_public_tenant", {
        tenant_slug: slug,
      });

      if (error) {
        console.error("Public tenant query error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as PublicTenantDetail;
    },
    enabled: !!slug,
  });
};
