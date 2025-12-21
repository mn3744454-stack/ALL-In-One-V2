import { Link, useLocation } from "react-router-dom";
import { Home, Globe, Plus, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  userId?: string;
  isBusinessOwner: boolean;
  onCreatePost?: () => void;
}

export const BottomNavigation = ({
  userId,
  isBusinessOwner,
  onCreatePost,
}: BottomNavigationProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* Feed */}
        <NavItem
          href="/community"
          icon={Home}
          label="Feed"
          active={isActive("/community")}
        />

        {/* Directory */}
        <NavItem
          href="/directory"
          icon={Globe}
          label="Directory"
          active={isActive("/directory")}
        />

        {/* Create Post - Center Button */}
        <button
          onClick={onCreatePost}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-gold text-gold-foreground flex items-center justify-center shadow-lg shadow-gold/30 hover:bg-gold/90 active:scale-95 transition-all">
            <Plus className="h-7 w-7" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Post</span>
        </button>

        {/* My Business (for owners) or Profile */}
        {isBusinessOwner ? (
          <NavItem
            href="/dashboard/public-profile"
            icon={Building2}
            label="Business"
            active={isActive("/dashboard/public-profile")}
          />
        ) : (
          <NavItem
            href="/dashboard"
            icon={Building2}
            label="Dashboard"
            active={isActive("/dashboard")}
          />
        )}

        {/* Profile */}
        <NavItem
          href={userId ? `/profile/${userId}` : "/dashboard"}
          icon={User}
          label="Profile"
          active={currentPath.startsWith("/profile/")}
        />
      </div>
    </nav>
  );
};

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavItem = ({ href, icon: Icon, label, active }: NavItemProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
        active
          ? "text-gold"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "fill-gold/20")} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
};
