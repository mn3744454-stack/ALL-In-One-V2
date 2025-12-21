import { useParams, Link } from "react-router-dom";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useUserPosts } from "@/hooks/usePosts";
import { ProfileHeader, PostFeed } from "@/components/community";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading: profileLoading } = usePublicProfile(id);
  const { data: posts, isLoading: postsLoading } = useUserPosts(id);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <h1 className="font-display text-2xl font-bold text-navy mb-2">
          Profile Not Found
        </h1>
        <p className="text-muted-foreground mb-4">
          The user you're looking for doesn't exist.
        </p>
        <Link to="/community">
          <Button variant="gold">Back to Community</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/community">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Community</span>
              </Button>
            </Link>
            <Logo className="h-8" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <ProfileHeader profile={profile} />

        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-navy">
            Posts
          </h2>
        </div>

        <PostFeed
          posts={posts}
          isLoading={postsLoading}
          emptyMessage="This user hasn't posted anything yet."
        />
      </div>
    </div>
  );
};

export default PublicProfile;
