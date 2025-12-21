import { Button } from "@/components/ui/button";
import { useIsFollowing, useFollow, useUnfollow } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
}

export const FollowButton = ({ userId, size = "default", variant = "default" }: FollowButtonProps) => {
  const { user } = useAuth();
  const { data: isFollowing, isLoading: checkingFollow } = useIsFollowing(userId);
  const follow = useFollow();
  const unfollow = useUnfollow();

  // Don't show follow button for own profile
  if (user?.id === userId) return null;

  const isLoading = checkingFollow || follow.isPending || unfollow.isPending;

  const handleClick = async () => {
    if (isFollowing) {
      await unfollow.mutateAsync(userId);
    } else {
      await follow.mutateAsync(userId);
    }
  };

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserMinus className="h-4 w-4" />
        )}
        Unfollow
      </Button>
    );
  }

  return (
    <Button
      variant={variant === "default" ? "gold" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      Follow
    </Button>
  );
};
