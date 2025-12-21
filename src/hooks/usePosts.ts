import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Post {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  visibility: "public" | "private" | "followers";
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export const useFeedPosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts"],
    queryFn: async (): Promise<Post[]> => {
      // Get posts
      const { data: posts, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get likes count and user's likes for each post
      const postIds = posts?.map((p) => p.id) || [];
      
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);

      return (posts || []).map((post) => ({
        ...post,
        visibility: post.visibility as "public" | "private" | "followers",
        likes_count: likesData?.filter((l) => l.post_id === post.id).length || 0,
        comments_count: commentsData?.filter((c) => c.post_id === post.id).length || 0,
        is_liked: likesData?.some((l) => l.post_id === post.id && l.user_id === user?.id) || false,
      }));
    },
    enabled: !!user,
  });
};

export const useUserPosts = (userId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async (): Promise<Post[]> => {
      if (!userId) return [];

      const { data: posts, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const postIds = posts?.map((p) => p.id) || [];
      
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);

      return (posts || []).map((post) => ({
        ...post,
        visibility: post.visibility as "public" | "private" | "followers",
        likes_count: likesData?.filter((l) => l.post_id === post.id).length || 0,
        comments_count: commentsData?.filter((c) => c.post_id === post.id).length || 0,
        is_liked: likesData?.some((l) => l.post_id === post.id && l.user_id === user?.id) || false,
      }));
    },
    enabled: !!userId && !!user,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      content,
      visibility = "public",
      media_urls = [],
    }: {
      content: string;
      visibility?: "public" | "private" | "followers";
      media_urls?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content,
          visibility,
          media_urls,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      toast({
        title: "Post created",
        description: "Your post has been published.",
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

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      toast({
        title: "Post deleted",
        description: "Your post has been removed.",
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

export const useLikePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
};

export const useUnlikePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
};
