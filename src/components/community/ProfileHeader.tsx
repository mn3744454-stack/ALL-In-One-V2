import { PublicProfile } from "@/hooks/usePublicProfile";
import { UserAvatar } from "./UserAvatar";
import { FollowButton } from "./FollowButton";
import { MapPin, Link as LinkIcon, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProfileHeaderProps {
  profile: PublicProfile;
}

export const ProfileHeader = ({ profile }: ProfileHeaderProps) => {
  const joinedAgo = formatDistanceToNow(new Date(profile.created_at), { addSuffix: true });

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-6">
      {/* Cover */}
      <div className="h-32 bg-gradient-to-r from-navy to-navy-light" />
      
      {/* Profile Info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-12 gap-4">
          <div className="flex items-end gap-4">
            <UserAvatar
              userId={profile.id}
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="xl"
              className="ring-4 ring-card"
            />
            <div className="pb-2">
              <h1 className="font-display text-2xl font-bold text-navy">
                {profile.full_name || "Anonymous User"}
              </h1>
              {profile.bio && (
                <p className="text-muted-foreground mt-1">{profile.bio}</p>
              )}
            </div>
          </div>
          <div className="sm:pb-2">
            <FollowButton userId={profile.id} size="default" />
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </div>
          )}
          {profile.website && (
            <a
              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gold hover:underline"
            >
              <LinkIcon className="h-4 w-4" />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Joined {joinedAgo}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-navy">
              {profile.posts_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-navy">
              {profile.followers_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-navy">
              {profile.following_count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>
    </div>
  );
};
