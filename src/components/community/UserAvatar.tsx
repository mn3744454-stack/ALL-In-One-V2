import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  linkToProfile?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
};

export const UserAvatar = ({
  userId,
  name,
  avatarUrl,
  size = "md",
  linkToProfile = false,
  className = "",
}: UserAvatarProps) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const avatarContent = (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
      <AvatarFallback className="bg-gold text-navy font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (linkToProfile && userId) {
    return (
      <Link to={`/profile/${userId}`} className="hover:opacity-80 transition-opacity">
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
};
