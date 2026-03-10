import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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
  collapsed?: boolean;
  tooltipSide?: "left" | "right";
}

/** Prefix-aware active check: exact match OR nested child route */
const isPathActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + "/");

export const NavGroup = ({ icon: Icon, label, items, onNavigate, collapsed, tooltipSide = "right" }: NavGroupProps) => {
  const location = useLocation();
  const isAnyActive = items.some(item => isPathActive(location.pathname, item.href));
  const [isOpen, setIsOpen] = useState(isAnyActive);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);

  // Auto-expand when a child becomes active (URL navigation, back/forward)
  useEffect(() => {
    if (isAnyActive) setIsOpen(true);
  }, [isAnyActive]);

  // Auto-scroll active child into view within the sidebar
  useEffect(() => {
    if (isAnyActive && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [location.pathname, isAnyActive]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    setPopoverOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(false);
    }, 150);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // ── Collapsed mode: icon + hover Popover flyout ──
  if (collapsed) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full flex justify-center px-0 py-2.5 rounded-xl transition-all cursor-pointer group",
                isAnyActive
                  ? "bg-gold/10 border border-gold/20"
                  : "hover:bg-navy/5"
              )}
              aria-expanded={popoverOpen}
              aria-label={label}
              onFocus={() => setPopoverOpen(true)}
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
            </button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          side={tooltipSide}
          align="start"
          className="w-52 p-2"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1.5 mb-1 border-b border-border/50">
            {label}
          </p>
          <div className="space-y-0.5">
            {items.map((item) => {
              const ItemIcon = item.icon;
              const isActive = isPathActive(location.pathname, item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    setPopoverOpen(false);
                    onNavigate?.();
                  }}
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
        </PopoverContent>
      </Popover>
    );
  }

  // ── Expanded mode: existing inline expand/collapse ──
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
        aria-expanded={isOpen}
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
            "flex-1 text-start font-medium",
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
        <div className="mt-2 ms-6 ps-3 border-s-2 border-gold/30 space-y-1">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = isPathActive(location.pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                ref={isActive ? activeRef : undefined}
                onClick={onNavigate}
                data-active={isActive ? "true" : undefined}
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
