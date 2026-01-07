import { cn } from "@/lib/utils";
import { Stethoscope, Syringe, Calendar, Settings } from "lucide-react";

interface VetBottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSettings?: boolean;
  overdueCount?: number;
}

export function VetBottomNavigation({
  activeTab,
  onTabChange,
  showSettings = false,
  overdueCount = 0,
}: VetBottomNavigationProps) {
  const tabs = [
    { id: "treatments", icon: Stethoscope, label: "Treatments" },
    { id: "vaccinations", icon: Syringe, label: "Vaccines" },
    { id: "followups", icon: Calendar, label: "Follow-ups", badge: overdueCount },
    ...(showSettings ? [{ id: "settings", icon: Settings, label: "Settings" }] : []),
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-20 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            badge={"badge" in tab ? tab.badge : undefined}
          />
        ))}
      </div>
    </nav>
  );
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon: Icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all relative",
        active ? "-mt-5" : "py-2"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-all relative",
          active
            ? "w-14 h-14 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            : "w-10 h-10 text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon
          className={cn(
            "transition-all",
            active ? "h-7 w-7" : "h-5 w-5"
          )}
        />
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium mt-1",
          active ? "text-primary font-semibold" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}
