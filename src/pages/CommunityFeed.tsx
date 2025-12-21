import { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useFeedPosts } from "@/hooks/usePosts";
import { PostComposer, PostFeed, BottomNavigation } from "@/components/community";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/community/UserAvatar";
import {
  Home,
  Users,
  Bell,
  Settings,
  LogOut,
  ArrowLeft,
  Building2,
  Globe,
} from "lucide-react";

const CommunityFeed = () => {
  const { user, profile, signOut } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { data: posts, isLoading } = useFeedPosts();
  const postComposerRef = useRef<HTMLDivElement>(null);
  
  const isBusinessOwner = activeRole === "owner" && !!activeTenant;

  const scrollToComposer = () => {
    postComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus the textarea after scrolling
    setTimeout(() => {
      const textarea = postComposerRef.current?.querySelector("textarea");
      textarea?.focus();
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-cream overflow-x-hidden pb-20 lg:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <Logo className="h-7 sm:h-8" size="sm" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
              <Bell className="h-5 w-5" />
            </Button>
            <Link to={`/profile/${user?.id}`}>
              <UserAvatar
                userId={user?.id}
                name={profile?.full_name}
                avatarUrl={profile?.avatar_url}
                size="sm"
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              {/* User Card */}
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <Link to={`/profile/${user?.id}`} className="flex items-center gap-3 mb-4">
                  <UserAvatar
                    userId={user?.id}
                    name={profile?.full_name}
                    avatarUrl={profile?.avatar_url}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-navy">
                      {profile?.full_name || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">View Profile</p>
                  </div>
                </Link>
              </div>

              {/* Navigation */}
              <nav className="bg-card rounded-2xl border border-border/50 p-2">
                <NavLink icon={Home} label="Feed" active />
                <NavLink icon={Users} label="Following" href="#" />
                <NavLink icon={Globe} label="Directory" href="/directory" />
                {isBusinessOwner && (
                  <NavLink icon={Building2} label="My Business" href="/dashboard/public-profile" />
                )}
                <NavLink icon={Settings} label="Settings" href="/dashboard" />
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-navy mb-1">
                Community Feed
              </h1>
              <p className="text-muted-foreground">
                See what's happening in the equestrian community
              </p>
            </div>

            <div ref={postComposerRef}>
              <PostComposer />
            </div>
            <PostFeed
              posts={posts}
              isLoading={isLoading}
              emptyMessage="No posts yet. Be the first to share something!"
            />
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              {/* Suggested */}
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <h3 className="font-semibold text-navy mb-3">Welcome to Community</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with other horse enthusiasts, share your experiences, and stay updated with the latest in the equestrian world.
                </p>
              </div>

              {/* Quick Links */}
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <h3 className="font-semibold text-navy mb-3">Quick Links</h3>
                <div className="space-y-2 text-sm">
                  <Link
                    to="/dashboard"
                    className="block text-muted-foreground hover:text-gold transition-colors"
                  >
                    → Dashboard
                  </Link>
                  <Link
                    to={`/profile/${user?.id}`}
                    className="block text-muted-foreground hover:text-gold transition-colors"
                  >
                    → My Profile
                  </Link>
                  <Link
                    to="/directory"
                    className="block text-muted-foreground hover:text-gold transition-colors"
                  >
                    → Browse Directory
                  </Link>
                  {isBusinessOwner && (
                    <Link
                      to="/dashboard/public-profile"
                      className="block text-gold hover:text-gold/80 transition-colors font-medium"
                    >
                      → Manage Business Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Navigation for Mobile/Tablet */}
      <BottomNavigation
        userId={user?.id}
        isBusinessOwner={isBusinessOwner}
        onCreatePost={scrollToComposer}
      />
    </div>
  );
};

const NavLink = ({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: any;
  label: string;
  href?: string;
  active?: boolean;
}) => {
  const className = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
    active
      ? "bg-gold/10 text-gold"
      : "text-muted-foreground hover:text-navy hover:bg-muted/50"
  }`;

  if (href) {
    return (
      <Link to={href} className={className}>
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  }

  return (
    <button className={className}>
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
};

export default CommunityFeed;
