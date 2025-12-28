import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { NavGroup } from "@/components/dashboard/NavGroup";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  TrendingUp,
  Heart,
  LogOut,
  MessageSquare,
  Globe,
  X,
  Package,
  GraduationCap,
  Ticket,
  CreditCard,
  ClipboardList,
  Baby,
  Stethoscope,
  FlaskConical,
} from "lucide-react";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
  highlight?: boolean;
}

const NavItem = ({
  icon: Icon,
  label,
  href,
  active,
  badge,
  onNavigate,
  highlight,
}: NavItemProps) => {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
        active
          ? "bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30 shadow-sm"
          : highlight
          ? "bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15"
          : "hover:bg-navy/5"
      )}
      onClick={onNavigate}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
          active
            ? "bg-gold text-navy shadow-sm"
            : highlight
            ? "bg-orange-500/20 text-orange-600"
            : "bg-navy/5 text-navy/60 group-hover:bg-navy/10 group-hover:text-navy/80"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span
        className={cn(
          "flex-1 font-medium",
          active ? "text-navy" : highlight ? "text-orange-700" : "text-navy/70"
        )}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "px-2 py-0.5 text-xs rounded-full font-medium",
            active ? "bg-gold/30 text-navy" : "bg-navy/10 text-navy/60"
          )}
        >
          {badge}
        </span>
      )}
      {highlight && (
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} onClick={onNavigate}>
        {content}
      </Link>
    );
  }

  return content;
};

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { horses } = useHorses();

  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  const horsesNavItems = [
    { icon: Heart, label: "My Horses", href: "/dashboard/horses", badge: horses.length },
    { icon: ClipboardList, label: "Orders", href: "/dashboard/horse-orders" },
    { icon: Baby, label: "Breeding", href: "/dashboard/breeding" },
    { icon: Stethoscope, label: "Vet & Health", href: "/dashboard/vet" },
    { icon: FlaskConical, label: "Laboratory", href: "/dashboard/laboratory" },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-cream via-cream to-cream-dark/50 border-r border-border/50 transform transition-transform duration-300 lg:translate-x-0 lg:static shadow-xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close Button */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between bg-white/50">
            <Logo />
            <button
              className="p-2 rounded-xl hover:bg-navy/5 lg:hidden transition-colors"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-navy/60" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <NavItem
              icon={Home}
              label="Dashboard"
              href="/dashboard"
              active={isActive("/dashboard")}
              onNavigate={onClose}
            />
            <NavItem
              icon={MessageSquare}
              label="Community"
              href="/community"
              active={isActive("/community")}
              onNavigate={onClose}
            />
            <NavItem
              icon={Ticket}
              label="My Bookings"
              href="/dashboard/my-bookings"
              active={isActive("/dashboard/my-bookings")}
              onNavigate={onClose}
            />
            <NavItem
              icon={CreditCard}
              label="Payments"
              href="/dashboard/payments"
              active={isActive("/dashboard/payments")}
              onNavigate={onClose}
            />

            {/* Horses NavGroup */}
            <NavGroup
              icon={Heart}
              label="Horses"
              items={horsesNavItems}
              onNavigate={onClose}
            />

            <NavItem icon={Calendar} label="Schedule" onNavigate={onClose} />
            <NavItem icon={FileText} label="Records" onNavigate={onClose} />
            <NavItem icon={Users} label="Team" onNavigate={onClose} />
            <NavItem icon={Building2} label="Facilities" onNavigate={onClose} />

            {/* Services & Revenue - for owners and managers */}
            {["owner", "manager"].includes(activeRole || "") && activeTenant && (
              <>
                <NavItem
                  icon={Package}
                  label="Services"
                  href="/dashboard/services"
                  active={isActive("/dashboard/services")}
                  onNavigate={onClose}
                />
                <NavItem
                  icon={TrendingUp}
                  label="Revenue"
                  href="/dashboard/revenue"
                  active={isActive("/dashboard/revenue")}
                  onNavigate={onClose}
                />
              </>
            )}

            {/* Academy sessions & bookings - for academy owners/managers */}
            {["owner", "manager"].includes(activeRole || "") &&
              activeTenant?.tenant.type === "academy" && (
                <>
                  <NavItem
                    icon={GraduationCap}
                    label="Sessions"
                    href="/dashboard/academy/sessions"
                    active={isActive("/dashboard/academy/sessions")}
                    onNavigate={onClose}
                  />
                  <NavItem
                    icon={Ticket}
                    label="Manage Bookings"
                    href="/dashboard/academy/bookings"
                    active={isActive("/dashboard/academy/bookings")}
                    onNavigate={onClose}
                  />
                </>
              )}

            {/* Public Profile - only for owners */}
            {activeRole === "owner" && activeTenant && (
              <NavItem
                icon={Globe}
                label="Public Profile"
                href="/dashboard/public-profile"
                active={isActive("/dashboard/public-profile")}
                onNavigate={onClose}
                highlight={needsPublicProfileSetup}
              />
            )}

            <div className="pt-4 mt-4 border-t border-border/50">
              <NavItem icon={Settings} label="Settings" onNavigate={onClose} />
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border/50 bg-white/30">
            <div className="p-3 rounded-xl bg-white shadow-sm border border-border/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-navy font-bold shadow-sm shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
                    {activeTenant?.tenant.name || "No Organization"}
                  </p>
                  <p className="text-xs text-navy/50 capitalize">
                    {activeRole || "Member"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-navy/60 hover:text-navy hover:bg-navy/5"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-navy/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};
