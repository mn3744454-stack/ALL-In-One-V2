import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Comment, useDeleteComment } from "@/hooks/useComments";
import { UserAvatar } from "./UserAvatar";
import { Trash2 } from "lucide-react";

interface CommentItemProps {
  comment: Comment;
}

export const CommentItem = ({ comment }: CommentItemProps) => {
  const { user } = useAuth();
  const deleteComment = useDeleteComment();
  const isAuthor = user?.id === comment.author_id;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  const handleDelete = async () => {
    if (confirm("Delete this comment?")) {
      await deleteComment.mutateAsync({
        commentId: comment.id,
        postId: comment.post_id,
      });
    }
  };

  return (
    <div className="flex gap-2 group">
      <UserAvatar
        userId={comment.author?.id}
        name={comment.author?.full_name}
        avatarUrl={comment.author?.avatar_url}
        size="sm"
        linkToProfile
      />
      <div className="flex-1 min-w-0">
        <div className="bg-background rounded-xl px-3 py-2">
          <Link
            to={`/profile/${comment.author_id}`}
            className="font-semibold text-sm text-navy hover:text-gold transition-colors"
          >
            {comment.author?.full_name || "Anonymous"}
          </Link>
          <p className="text-sm text-foreground">{comment.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteComment.isPending}
              className="h-5 px-1 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
