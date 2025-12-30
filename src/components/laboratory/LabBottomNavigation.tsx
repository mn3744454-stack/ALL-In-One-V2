import { cn } from "@/lib/utils";
import { 
  FlaskConical, 
  FileText, 
  Clock, 
  FileStack, 
  Settings,
  Plus,
  GitCompare
} from "lucide-react";

interface LabBottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAction?: () => void;
}

export function LabBottomNavigation({
  activeTab,
  onTabChange,
  onQuickAction,
}: LabBottomNavigationProps) {
  const tabs = [
    { id: "samples", icon: FlaskConical, label: "Samples" },
    { id: "results", icon: FileText, label: "Results" },
    { id: "compare", icon: GitCompare, label: "Compare" },
    { id: "templates", icon: FileStack, label: "Templates" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {tabs.slice(0, 2).map((tab) => (
          <NavItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}

        {/* Center Quick Action Button */}
        <button
          onClick={onQuickAction}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all">
            <Plus className="h-7 w-7" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Add</span>
        </button>

        {tabs.slice(2).map((tab) => (
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
        "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-[50px]",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "fill-primary/20")} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
