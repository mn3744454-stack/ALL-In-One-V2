import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Map, LayoutGrid, Settings } from "lucide-react";

interface HousingBottomNavProps {
  activeTab: 'areas' | 'units' | 'settings';
  onTabChange: (tab: 'areas' | 'units' | 'settings') => void;
}

export function HousingBottomNav({ activeTab, onTabChange }: HousingBottomNavProps) {
  const { t, dir } = useI18n();

  const tabs = [
    { id: 'areas' as const, icon: Map, label: t('housing.tabs.areas') },
    { id: 'units' as const, icon: LayoutGrid, label: t('housing.tabs.units') },
    { id: 'settings' as const, icon: Settings, label: t('housing.tabs.settings') },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-border/50 z-40 md:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[64px]",
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
