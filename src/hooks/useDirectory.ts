import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTenant {
  id: string;
  slug: string | null;
  type: string;
  display_name: string;
  public_description: string | null;
  public_location_text: string | null;
  region: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tags: string[] | null;
  is_listed: boolean;
  created_at: string;
}

export interface DirectoryFilters {
  search?: string;
  type?: string;
  region?: string;
}

export const TENANT_TYPES = [
  { value: "stable", label: "Stable", labelAr: "إسطبل" },
  { value: "clinic", label: "Veterinary Clinic", labelAr: "عيادة بيطرية" },
  { value: "lab", label: "Laboratory", labelAr: "مختبر" },
  { value: "pharmacy", label: "Pharmacy", labelAr: "صيدلية" },
  { value: "academy", label: "Training Academy", labelAr: "أكاديمية تدريب" },
  { value: "transport", label: "Transport", labelAr: "نقل خيول" },
  { value: "auction", label: "Auction House", labelAr: "مزاد" },
  { value: "horse_owner", label: "Horse Owner", labelAr: "مالك خيل" },
  { value: "trainer", label: "Independent Trainer", labelAr: "مدرب مستقل" },
  { value: "doctor", label: "Independent Doctor", labelAr: "طبيب بيطري مستقل" },
] as const;

export const REGIONS = [
  { value: "riyadh", label: "Riyadh", labelAr: "الرياض" },
  { value: "jeddah", label: "Jeddah", labelAr: "جدة" },
  { value: "dammam", label: "Dammam", labelAr: "الدمام" },
  { value: "mecca", label: "Mecca", labelAr: "مكة المكرمة" },
  { value: "medina", label: "Medina", labelAr: "المدينة المنورة" },
  { value: "khobar", label: "Al Khobar", labelAr: "الخبر" },
  { value: "tabuk", label: "Tabuk", labelAr: "تبوك" },
  { value: "other", label: "Other", labelAr: "أخرى" },
] as const;

export const useDirectory = (filters: DirectoryFilters = {}) => {
  return useQuery({
    queryKey: ["directory", filters],
    queryFn: async (): Promise<PublicTenant[]> => {
      // Query public tenants directly with RLS policy
      let query = supabase
        .from("tenants")
        .select("id, slug, type, name, public_name, public_description, public_location_text, region, logo_url, cover_url, tags, is_listed, created_at")
        .eq("is_public", true)
        .eq("is_listed", true)
        .order("created_at", { ascending: false });

      // Apply type filter
      if (filters.type) {
        query = query.eq("type", filters.type as any);
      }

      // Apply region filter
      if (filters.region) {
        query = query.eq("region", filters.region);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Directory query error:", error);
        throw error;
      }

      // Map to PublicTenant format
      let results: PublicTenant[] = (data || []).map((t: any) => ({
        id: t.id,
        slug: t.slug,
        type: t.type,
        display_name: t.public_name || t.name,
        public_description: t.public_description,
        public_location_text: t.public_location_text,
        region: t.region,
        logo_url: t.logo_url,
        cover_url: t.cover_url,
        tags: t.tags,
        is_listed: t.is_listed,
        created_at: t.created_at,
      }));

      // Apply search filter client-side (for name and tags)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (tenant) =>
            tenant.display_name?.toLowerCase().includes(searchLower) ||
            tenant.public_description?.toLowerCase().includes(searchLower) ||
            tenant.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }

      return results;
    },
  });
};
