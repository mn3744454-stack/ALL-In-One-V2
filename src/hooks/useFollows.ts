import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface FollowRelation {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useFollowers = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async (): Promise<FollowRelation[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("follows")
        .select(`
          *,
          profile:profiles!follows_follower_id_fkey(id, full_name, avatar_url)
        `)
        .eq("following_id", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

export const useFollowing = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async (): Promise<FollowRelation[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("follows")
        .select(`
          *,
          profile:profiles!follows_following_id_fkey(id, full_name, avatar_url)
        `)
        .eq("follower_id", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
};

export const useIsFollowing = (targetUserId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-following", user?.id, targetUserId],
    queryFn: async (): Promise<boolean> => {
      if (!user || !targetUserId || user.id === targetUserId) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
};

export const useFollow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      if (user.id === targetUserId) throw new Error("Cannot follow yourself");

      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      toast({
        title: "Following",
        description: "You are now following this user.",
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

export const useUnfollow = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["public-profile", targetUserId] });
      toast({
        title: "Unfollowed",
        description: "You have unfollowed this user.",
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
