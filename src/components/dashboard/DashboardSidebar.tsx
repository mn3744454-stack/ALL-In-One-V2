import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import Logo from "@/components/Logo";
import { NavGroup } from "@/components/dashboard/NavGroup";
import { LogoutConfirmDialog } from "@/components/LogoutConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsDesktop } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { LAB_NAV_SECTIONS } from "@/navigation/labNavConfig";
import { PERSONAL_NAV_MODULES, ORG_NAV_MODULES } from "@/navigation/workspaceNavConfig";
import { Users as UsersIcon, BellRing } from "lucide-react";
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
  ArrowLeftRight,
  Warehouse,
  FolderOpen,
  Wallet,
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
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole, workspaceMode } = useTenant();
  const { horses } = useHorses();
  const { hasPermission } = usePermissions();
  const { 
    labMode, 
    isLabTenant,
    vetEnabled, 
    housingEnabled, 
    movementEnabled, 
    breedingEnabled 
  } = useModuleAccess();
  const { t, dir } = useI18n();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Determine if this tenant type "owns" horses (stable-centric feature)
  const tenantType = activeTenant?.tenant.type;
  const isHorseOwningTenant = !tenantType || tenantType === 'stable' || tenantType === 'academy';
  
  // Check if a lab tab route is active
  const isLabTabActive = (tab: string) => {
    if (!location.pathname.startsWith('/dashboard/laboratory')) return false;
    return searchParams.get('tab') === tab;
  };

  // Build horses nav items conditionally based on module access
  const horsesNavItems = useMemo(() => {
    const items = [
      { icon: Heart, label: t('sidebar.myHorses'), href: "/dashboard/horses", badge: horses.length },
      { icon: ClipboardList, label: t('sidebar.orders'), href: "/dashboard/horse-orders" },
    ];
    
    if (breedingEnabled) {
      items.push({ icon: Baby, label: t('sidebar.breeding'), href: "/dashboard/breeding" });
    }
    
    if (vetEnabled) {
      items.push({ icon: Stethoscope, label: t('sidebar.vetHealth'), href: "/dashboard/vet" });
    }
    
    if (labMode !== 'none') {
      items.push({ icon: FlaskConical, label: t('sidebar.laboratory'), href: "/dashboard/laboratory" });
    }
    
    if (movementEnabled) {
      items.push({ icon: ArrowLeftRight, label: t('sidebar.movement'), href: "/dashboard/movement" });
    }
    
    return items;
  }, [horses.length, breedingEnabled, vetEnabled, labMode, movementEnabled, t]);

  // Build HR nav items
  const hrNavItems = useMemo(() => [
    { icon: Users, label: t('hr.title'), href: "/dashboard/hr" },
    { icon: Wallet, label: t('hr.payroll.title'), href: "/dashboard/hr/payroll" },
  ], [t]);

  // Build Finance nav items (includes Clients for non-lab tenants)
  const financeNavItems = useMemo(() => [
    { icon: TrendingUp, label: t('finance.overview'), href: "/dashboard/finance" },
    { icon: FileText, label: t('finance.invoices.title'), href: "/dashboard/finance/invoices" },
    { icon: CreditCard, label: t('finance.expenses.title'), href: "/dashboard/finance/expenses" },
    { icon: UsersIcon, label: t('clients.title'), href: "/dashboard/clients" },
  ], [t]);

  // Don't render sidebar at all on mobile/tablet (<1024px)
  if (!isDesktop) return null;

  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    setShowLogoutConfirm(false);
    await signOut();
  };

  const isActive = (path: string) => location.pathname === path;

  // Check if module is enabled
  const isModuleEnabled = (moduleKey?: string): boolean => {
    if (!moduleKey) return true;
    switch (moduleKey) {
      case "breeding": return breedingEnabled;
      case "vet": return vetEnabled;
      case "lab": return labMode !== "none";
      case "movement": return movementEnabled;
      case "housing": return housingEnabled;
      default: return true;
    }
  };

  // RTL-aware sidebar positioning
  const sidebarPositionClasses = dir === 'rtl'
    ? 'right-0'
    : 'left-0';

  const sidebarTransformClasses = dir === 'rtl'
    ? (isOpen ? 'translate-x-0' : 'translate-x-full')
    : (isOpen ? 'translate-x-0' : '-translate-x-full');

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 z-50 w-64 bg-gradient-to-b from-cream via-cream to-cream-dark/50 border-border/50 transform transition-transform duration-300 shadow-xl lg:shadow-none lg:static lg:translate-x-0",
          sidebarPositionClasses,
          sidebarTransformClasses,
          dir === 'rtl' ? 'border-l' : 'border-r'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close Button */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3 bg-white/50">
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
            {/* Dashboard - always visible */}
            <NavItem
              icon={Home}
              label={t('sidebar.dashboard')}
              href="/dashboard"
              active={isActive("/dashboard")}
              onNavigate={onClose}
            />

            {/* PERSONAL WORKSPACE MODE - show personal nav items */}
            {workspaceMode === "personal" && (
              <>
                <NavItem
                  icon={MessageSquare}
                  label={t('sidebar.community')}
                  href="/community"
                  active={isActive("/community")}
                  onNavigate={onClose}
                />
                <NavItem
                  icon={Ticket}
                  label={t('sidebar.myBookings')}
                  href="/dashboard/my-bookings"
                  active={isActive("/dashboard/my-bookings")}
                  onNavigate={onClose}
                />
                <NavItem
                  icon={CreditCard}
                  label={t('sidebar.myPayments')}
                  href="/dashboard/my-payments"
                  active={isActive("/dashboard/my-payments")}
                  onNavigate={onClose}
                />
                <NavItem
                  icon={Calendar}
                  label={t('sidebar.schedule')}
                  href="/dashboard/schedule"
                  active={isActive("/dashboard/schedule")}
                  onNavigate={onClose}
                />
                <NavItem
                  icon={FileText}
                  label={t('sidebar.records')}
                  href="/dashboard/records"
                  active={isActive("/dashboard/records")}
                  onNavigate={onClose}
                />
              </>
            )}

            {/* ORGANIZATION WORKSPACE MODE - show org nav items */}
            {workspaceMode === "organization" && activeTenant && (
              <>
                {/* Community - requires permission */}
                {hasPermission('community.view') && (
                  <NavItem
                    icon={MessageSquare}
                    label={t('sidebar.community')}
                    href="/community"
                    active={isActive("/community")}
                    onNavigate={onClose}
                  />
                )}
                
                {/* Bookings - requires permission */}
                {hasPermission('bookings.view') && (
                  <NavItem
                    icon={Ticket}
                    label={t('sidebar.myBookings')}
                    href="/dashboard/my-bookings"
                    active={isActive("/dashboard/my-bookings")}
                    onNavigate={onClose}
                  />
                )}
                
                {/* Payments - requires permission */}
                {hasPermission('payments.view') && (
                  <NavItem
                    icon={CreditCard}
                    label={t('sidebar.payments')}
                    href="/dashboard/payments"
                    active={isActive("/dashboard/payments")}
                    onNavigate={onClose}
                  />
                )}

                {/* LAB TENANT PRIMARY NAV - Lab sections as top-level items */}
                {isLabTenant && labMode === 'full' && (
                  <>
                    {LAB_NAV_SECTIONS.map((section) => (
                      <NavItem
                        key={section.key}
                        icon={section.icon}
                        label={t(section.labelKey)}
                        href={section.route}
                        active={isLabTabActive(section.tab)}
                        onNavigate={onClose}
                      />
                    ))}
                  </>
                )}

                {/* Horses NavGroup - Only show for horse-owning tenant types (NOT lab tenants) */}
                {isHorseOwningTenant && !isLabTenant && (
                  <NavGroup
                    icon={Heart}
                    label={t('sidebar.horses')}
                    items={horsesNavItems}
                    onNavigate={onClose}
                  />
                )}

                {/* Vet - Show for Clinic tenants even when not in horses group */}
                {!isHorseOwningTenant && !isLabTenant && vetEnabled && (
                  <NavItem
                    icon={Stethoscope}
                    label={t('sidebar.vetHealth')}
                    href="/dashboard/vet"
                    active={isActive("/dashboard/vet")}
                    onNavigate={onClose}
                  />
                )}

                {/* Lab - Show for Clinic/other tenants as single entry (NOT for lab tenants who have expanded nav) */}
                {!isHorseOwningTenant && !isLabTenant && labMode !== 'none' && (
                  <NavItem
                    icon={FlaskConical}
                    label={t('sidebar.laboratory')}
                    href="/dashboard/laboratory"
                    active={isActive("/dashboard/laboratory")}
                    onNavigate={onClose}
                  />
                )}

                <NavItem 
                  icon={Calendar} 
                  label={t('sidebar.schedule')} 
                  href="/dashboard/schedule"
                  active={isActive("/dashboard/schedule")}
                  onNavigate={onClose} 
                />
                <NavItem 
                  icon={FileText} 
                  label={t('sidebar.records')} 
                  href="/dashboard/records"
                  active={isActive("/dashboard/records")}
                  onNavigate={onClose} 
                />
                
                {/* HR / Team NavGroup - for owners and managers */}
                {["owner", "manager"].includes(activeRole || "") && (
                  <NavGroup
                    icon={Users}
                    label={t('sidebar.hr')}
                    items={hrNavItems}
                    onNavigate={onClose}
                  />
                )}
                
                {/* Housing - for owners and managers AND if housing is enabled */}
                {housingEnabled && ["owner", "manager"].includes(activeRole || "") && (
                  <NavItem
                    icon={Warehouse}
                    label={t('sidebar.housing')}
                    href="/dashboard/housing"
                    active={isActive("/dashboard/housing")}
                    onNavigate={onClose}
                  />
                )}

                {/* Services - for owners and managers */}
                {["owner", "manager"].includes(activeRole || "") && (
                  <NavItem
                    icon={Package}
                    label={t('sidebar.services')}
                    href="/dashboard/services"
                    active={isActive("/dashboard/services")}
                    onNavigate={onClose}
                  />
                )}
                
                {/* Finance NavGroup - for owners and managers */}
                {["owner", "manager"].includes(activeRole || "") && (
                  <NavGroup
                    icon={Wallet}
                    label={t('finance.title')}
                    items={financeNavItems}
                    onNavigate={onClose}
                  />
                )}

                {/* Files - for owners and managers */}
                {["owner", "manager"].includes(activeRole || "") && (
                  <NavItem
                    icon={FolderOpen}
                    label={t('files.title')}
                    href="/dashboard/files"
                    active={isActive("/dashboard/files")}
                    onNavigate={onClose}
                  />
                )}

                {/* Academy sessions & bookings - for academy owners/managers */}
                {["owner", "manager"].includes(activeRole || "") &&
                  activeTenant?.tenant.type === "academy" && (
                    <>
                      <NavItem
                        icon={GraduationCap}
                        label={t('sidebar.sessions')}
                        href="/dashboard/academy/sessions"
                        active={isActive("/dashboard/academy/sessions")}
                        onNavigate={onClose}
                      />
                      <NavItem
                        icon={Ticket}
                        label={t('sidebar.manageBookings')}
                        href="/dashboard/academy/bookings"
                        active={isActive("/dashboard/academy/bookings")}
                        onNavigate={onClose}
                      />
                    </>
                  )}

                {/* Public Profile - only for owners */}
                {activeRole === "owner" && (
                  <NavItem
                    icon={Globe}
                    label={t('sidebar.publicProfile')}
                    href="/dashboard/public-profile"
                    active={isActive("/dashboard/public-profile")}
                    onNavigate={onClose}
                    highlight={needsPublicProfileSetup}
                  />
                )}

                <div className="pt-4 mt-4 border-t border-border/50 space-y-1">
                  {activeRole === "owner" && (
                    <NavItem 
                      icon={Settings} 
                      label={t('sidebar.settings')} 
                      href="/dashboard/settings"
                      active={isActive("/dashboard/settings")}
                      onNavigate={onClose} 
                    />
                  )}
                  <NavItem 
                    icon={BellRing} 
                    label={t('sidebar.notificationSettings')} 
                    href="/dashboard/settings/notifications"
                    active={isActive("/dashboard/settings/notifications")}
                    onNavigate={onClose} 
                  />
                </div>
              </>
            )}
          </nav>


          {/* User Section with Language Selector */}
          <div className="p-4 border-t border-border/50 bg-white/30">
            {/* Language Selector */}
            <div className="mb-3">
              <LanguageSelector />
            </div>
            
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
                className="w-full justify-start gap-2 text-navy/60 hover:text-navy hover:bg-navy/5"
                onClick={handleSignOutClick}
              >
                <LogOut className="w-4 h-4" />
                {t('sidebar.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={handleSignOutConfirm}
      />

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
