import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { 
  FlaskConical, 
  FileText, 
  FileStack, 
  Settings,
  GitCompare,
  ClipboardList,
  ShoppingBag,
  MessageSquare
} from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";

interface LabBottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function LabBottomNavigation({
  activeTab,
  onTabChange,
}: LabBottomNavigationProps) {
  const { t } = useI18n();
  const { labMode } = useModuleAccess();

  const tabs = useMemo(() => {
    if (labMode === 'requests') {
      return [
        { id: "requests", icon: ClipboardList, labelKey: "laboratory.tabs.requests" },
        { id: "results", icon: FileText, labelKey: "laboratory.bottomNav.results" },
        { id: "messages", icon: MessageSquare, labelKey: "laboratory.messages.tabLabel" },
        { id: "settings", icon: Settings, labelKey: "laboratory.bottomNav.settings" },
      ];
    }
    return [
      { id: "samples", icon: FlaskConical, labelKey: "laboratory.bottomNav.samples" },
      { id: "results", icon: FileText, labelKey: "laboratory.bottomNav.results" },
      { id: "requests", icon: ClipboardList, labelKey: "laboratory.nav.requests" },
      { id: "catalog", icon: ShoppingBag, labelKey: "laboratory.catalog.title" },
      { id: "settings", icon: Settings, labelKey: "laboratory.bottomNav.settings" },
    ];
  }, [labMode]);

  // Don't render if labMode is neither 'full' nor 'requests'
  if (labMode !== 'full' && labMode !== 'requests') {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-20 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            icon={tab.icon}
            label={t(tab.labelKey)}
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
