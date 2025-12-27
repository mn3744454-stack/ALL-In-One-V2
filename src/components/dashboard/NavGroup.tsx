import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavSubItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface NavGroupProps {
  icon: React.ElementType;
  label: string;
  items: NavSubItem[];
  onNavigate?: () => void;
}

export const NavGroup = ({ icon: Icon, label, items, onNavigate }: NavGroupProps) => {
  const location = useLocation();
  const isAnyActive = items.some(item => location.pathname === item.href);
  const [isOpen, setIsOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
          isAnyActive
            ? "bg-gold/10 border border-gold/20"
            : "hover:bg-navy/5"
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
            isAnyActive
              ? "bg-gold text-navy shadow-sm"
              : "bg-navy/5 text-navy/60 group-hover:bg-navy/10 group-hover:text-navy/80"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            "flex-1 text-left font-medium",
            isAnyActive ? "text-navy" : "text-navy/70"
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-navy/40 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-2 ml-6 pl-3 border-l-2 border-gold/30 space-y-1">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                  isActive
                    ? "bg-gold text-navy font-semibold shadow-sm"
                    : "text-navy/60 hover:text-navy hover:bg-gold/10"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full font-medium",
                      isActive ? "bg-navy/20 text-navy" : "bg-navy/10 text-navy/60"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
