import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Calendar, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface MobileBottomNavProps {
  onOpenLauncher?: () => void;
}

export function MobileBottomNav({ onOpenLauncher }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useI18n();

  const items = [
    { key: "home", icon: Home, labelKey: "nav.home", route: "/dashboard" },
    { key: "horses", icon: Heart, labelKey: "sidebar.horses", route: "/dashboard/horses" },
    { key: "schedule", icon: Calendar, labelKey: "sidebar.schedule", route: "/dashboard/schedule" },
    { key: "more", icon: LayoutGrid, labelKey: "nav.more", route: null },
  ];

  const isActive = (route: string | null) => {
    if (!route) return false;
    return location.pathname === route || location.pathname.startsWith(route + "/");
  };

  const handleClick = (route: string | null) => {
    if (route) {
      navigate(route);
    } else {
      onOpenLauncher?.();
    }
  };

  return (
    <nav 
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      dir={dir}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const active = item.route ? isActive(item.route) : false;
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
