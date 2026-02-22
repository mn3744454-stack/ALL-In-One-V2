import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Home, Heart, Calendar, LayoutGrid, FlaskConical, FileText, MessageSquare, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";

interface MobileBottomNavProps {
  onOpenLauncher?: () => void;
}

export function MobileBottomNav({ onOpenLauncher }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, dir } = useI18n();
  const { workspaceMode } = useTenant();
  const { isLabTenant, labMode } = useModuleAccess();

  // Hide this nav on Lab pages when labMode=full or requests (LabBottomNavigation handles it)
  const isOnLabPage = location.pathname.startsWith('/dashboard/laboratory');
  const shouldHideForLabPage = isOnLabPage && (labMode === 'full' || labMode === 'requests');

  // Define items based on workspace mode and tenant type
  const items = useMemo(() => {
    // Personal workspace mode - user-centric items
    if (workspaceMode === "personal") {
      return [
        { key: "home", icon: Home, labelKey: "nav.home", route: "/dashboard", tab: null },
        { key: "community", icon: MessageSquare, labelKey: "sidebar.community", route: "/community", tab: null },
        { key: "bookings", icon: Ticket, labelKey: "sidebar.myBookings", route: "/dashboard/my-bookings", tab: null },
        { key: "more", icon: LayoutGrid, labelKey: "nav.more", route: null, tab: null },
      ];
    }

    // Organization workspace mode
    if (isLabTenant && labMode === 'full') {
      // Lab tenant: Home, Samples, Results, More
      return [
        { key: "home", icon: Home, labelKey: "nav.home", route: "/dashboard", tab: null },
        { key: "samples", icon: FlaskConical, labelKey: "laboratory.nav.samples", route: "/dashboard/laboratory?tab=samples", tab: "samples" },
        { key: "results", icon: FileText, labelKey: "laboratory.nav.results", route: "/dashboard/laboratory?tab=results", tab: "results" },
        { key: "more", icon: LayoutGrid, labelKey: "nav.more", route: null, tab: null },
      ];
    }
    
    // Default: stable-centric items for organization mode
    return [
      { key: "home", icon: Home, labelKey: "nav.home", route: "/dashboard", tab: null },
      { key: "horses", icon: Heart, labelKey: "sidebar.horses", route: "/dashboard/horses", tab: null },
      { key: "schedule", icon: Calendar, labelKey: "sidebar.schedule", route: "/dashboard/schedule", tab: null },
      { key: "more", icon: LayoutGrid, labelKey: "nav.more", route: null, tab: null },
    ];
  }, [workspaceMode, isLabTenant, labMode]);

  const isActive = (route: string | null, tab: string | null) => {
    if (!route) return false;
    
    // For lab tab routes, check the tab query param
    if (tab && location.pathname.startsWith('/dashboard/laboratory')) {
      return searchParams.get('tab') === tab;
    }
    
    // For exact dashboard match
    if (route === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    
    return location.pathname === route || location.pathname.startsWith(route.split('?')[0] + "/");
  };

  const handleClick = (route: string | null) => {
    if (route) {
      navigate(route);
    } else {
      onOpenLauncher?.();
    }
  };

  // Don't render if we should hide for lab page (LabBottomNavigation is shown instead)
  if (shouldHideForLabPage) {
    return null;
  }

  return (
    <nav 
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      dir={dir}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const active = isActive(item.route, item.tab);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => handleClick(item.route)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                  active && "bg-primary/10"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium mt-0.5">
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}