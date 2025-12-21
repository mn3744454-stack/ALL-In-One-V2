import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLikePost, useUnlikePost, useDeletePost, Post } from "@/hooks/usePosts";
import { UserAvatar } from "./UserAvatar";
import { CommentList } from "./CommentList";
import { Heart, MessageCircle, MoreHorizontal, Trash2, Globe, Users, Lock } from "lucide-react";

interface PostCardProps {
  post: Post;
}

export const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();

  const isAuthor = user?.id === post.author_id;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const handleLikeToggle = async () => {
    if (post.is_liked) {
      await unlikePost.mutateAsync(post.id);
    } else {
      await likePost.mutateAsync(post.id);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      await deletePost.mutateAsync(post.id);
    }
  };

  const visibilityIcons = {
    public: Globe,
    followers: Users,
    private: Lock,
  };

  const VisibilityIcon = visibilityIcons[post.visibility];

  return (
    <Card variant="elevated" className="mb-4 overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              userId={post.author?.id}
              name={post.author?.full_name}
              avatarUrl={post.author?.avatar_url}
              size="md"
              linkToProfile
            />
            <div>
              <Link
                to={`/profile/${post.author_id}`}
                className="font-semibold text-navy hover:text-gold transition-colors"
              >
                {post.author?.full_name || "Anonymous"}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{timeAgo}</span>
                <VisibilityIcon className="h-3 w-3" />
              </div>
            </div>
          </div>
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
      </CardContent>

      <CardFooter className="p-4 pt-2 flex items-center gap-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLikeToggle}
          disabled={likePost.isPending || unlikePost.isPending}
          className={`gap-2 ${post.is_liked ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${post.is_liked ? "fill-current" : ""}`} />
          {post.likes_count || 0}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-2 text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments_count || 0}
        </Button>
      </CardFooter>

      {showComments && (
        <div className="border-t border-border/50 bg-muted/30 p-4">
          <CommentList postId={post.id} />
        </div>
      )}
    </Card>
  );
};
