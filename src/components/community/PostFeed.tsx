import { Post } from "@/hooks/usePosts";
import { PostCard } from "./PostCard";
import { Loader2 } from "lucide-react";

interface PostFeedProps {
  posts: Post[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}

export const PostFeed = ({ posts, isLoading, emptyMessage = "No posts yet" }: PostFeedProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
