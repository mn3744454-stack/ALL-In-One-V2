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
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer",
          isAnyActive
            ? "bg-gold/20 text-gold font-semibold"
            : "text-cream/70 hover:bg-navy-light hover:text-cream"
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-1 ml-4 pl-4 border-l border-navy-light space-y-1">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-sm",
                  isActive
                    ? "bg-gold text-navy font-semibold"
                    : "text-cream/70 hover:bg-navy-light hover:text-cream"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gold/20 text-gold">
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
