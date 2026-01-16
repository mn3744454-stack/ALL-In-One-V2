import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * PublicProfile interface - safe fields only (NO email/phone)
 * Used for community/public profile display
 */
export interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

/**
 * Fetches a user's public profile from public_profile_fields table
 * This table contains only safe fields (no email/phone PII)
 */
export const usePublicProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!userId) return null;

      // Query safe public_profile_fields table (NO PII exposure)
      const { data: profile, error } = await supabase
        .from("public_profile_fields")
        .select("id, full_name, avatar_url, bio, location, website, social_links, created_at")
        .eq("id", userId)
        .single();

      if (error) {
        // Handle case where profile doesn't exist in projection table yet
        if (error.code === "PGRST116") return null;
        throw error;
      }
      if (!profile) return null;

      // Get followers count
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      // Get following count
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      // Get posts count
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId);

      return {
        ...profile,
        social_links: profile.social_links as Record<string, string> | null,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
      };
    },
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: {
      full_name?: string;
      bio?: string;
      location?: string;
      website?: string;
      social_links?: Record<string, string>;
      avatar_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
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
