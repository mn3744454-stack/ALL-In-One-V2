import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Map, LayoutGrid, Settings } from "lucide-react";

interface HousingBottomNavProps {
  activeTab: 'areas' | 'units' | 'settings';
  onTabChange: (tab: 'areas' | 'units' | 'settings') => void;
}

export function HousingBottomNav({ activeTab, onTabChange }: HousingBottomNavProps) {
  const { t } = useI18n();

  const tabs = [
    { id: 'areas' as const, icon: Map, label: t('housing.tabs.areas') },
    { id: 'units' as const, icon: LayoutGrid, label: t('housing.tabs.units') },
    { id: 'settings' as const, icon: Settings, label: t('housing.tabs.settings') },
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
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all",
        active ? "-mt-5" : "py-2"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-all",
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
