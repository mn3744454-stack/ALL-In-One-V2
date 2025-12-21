import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateComment } from "@/hooks/useComments";
import { UserAvatar } from "./UserAvatar";
import { Send, Loader2 } from "lucide-react";

interface CommentFormProps {
  postId: string;
}

export const CommentForm = ({ postId }: CommentFormProps) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: content.trim(),
    });

    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <UserAvatar
        userId={user?.id}
        name={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        size="sm"
      />
      <div className="flex-1 flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 h-9 bg-background border-border/50"
        />
        <Button
          type="submit"
          size="sm"
          variant="gold"
          disabled={!content.trim() || createComment.isPending}
          className="h-9 w-9 p-0"
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
};
