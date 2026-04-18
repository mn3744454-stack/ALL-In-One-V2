import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Users as UsersIcon, BellRing, ChevronsLeft } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  BookOpen,
  Heart,
  Banknote,
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
  Activity,
  ShoppingCart,
  UserCircle,
  Shield,
  Link2,
  LayoutGrid,
  ClipboardCheck,
  ArrowDownToLine,
} from "lucide-react";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
  highlight?: boolean;
  collapsed?: boolean;
  tooltipSide?: "left" | "right";
}

const NavItem = ({
  icon: Icon,
  label,
  href,
  active,
  badge,
  onNavigate,
  highlight,
  collapsed,
  tooltipSide = "right",
}: NavItemProps) => {
  const content = (
    <div
      data-active={active ? "true" : undefined}
      className={cn(
        "flex items-center rounded-xl transition-all cursor-pointer group",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
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
      {!collapsed && (
        <>
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
        </>
      )}
    </div>
  );

  const wrappedContent = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Link to={href} onClick={onNavigate}>
            {content}
          </Link>
        ) : (
          content
        )}
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="font-medium">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ms-1.5 text-xs opacity-70">({badge})</span>
        )}
      </TooltipContent>
    </Tooltip>
  ) : href ? (
    <Link to={href} onClick={onNavigate}>
      {content}
    </Link>
  ) : (
    content
  );

  return wrappedContent;
};

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}

const COLLAPSED_KEY = "sidebar-collapsed";

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
  const navRef = useRef<HTMLElement>(null);

  // Collapsed state — desktop only, persisted
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  const tooltipSide: "left" | "right" = dir === "rtl" ? "left" : "right";

  // Auto-scroll active nav item into view on route change
  useEffect(() => {
    if (collapsed) return; // No scroll needed in icon-only rail
    const timer = setTimeout(() => {
      const el = navRef.current?.querySelector('[data-active="true"]');
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, collapsed]);

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
    
    // Movement consolidated under Housing tab — no standalone sidebar item
    
    return items;
  }, [horses.length, breedingEnabled, vetEnabled, labMode, movementEnabled, t]);

  // Build HR nav items (now includes Team & Partners)
  const hrNavItems = useMemo(() => [
    { icon: Users, label: t('teamPartners.title') || 'Team & Partners', href: "/dashboard/team" },
    { icon: Users, label: t('hr.title'), href: "/dashboard/hr" },
    { icon: Wallet, label: t('hr.payroll.title'), href: "/dashboard/hr/payroll" },
  ], [t]);

  // Build Finance nav items
  const financeNavItems = useMemo(() => [
    { icon: BookOpen, label: t('finance.tabs.ledger'), href: "/dashboard/finance/ledger" },
    { icon: FileText, label: t('finance.invoices.title'), href: "/dashboard/finance/invoices" },
    { icon: CreditCard, label: t('finance.expenses.title'), href: "/dashboard/finance/expenses" },
    { icon: Banknote, label: t('finance.tabs.payments'), href: "/dashboard/finance/payments" },
    { icon: UsersIcon, label: t('finance.customerBalances.title'), href: "/dashboard/finance/customer-balances" },
    { icon: ShoppingCart, label: t('sidebar.pos'), href: "/dashboard/finance/pos" },
  ], [t]);

  // Build Settings nav items (owner-only sub-pages)
  const settingsNavItems = useMemo(() => [
    { icon: Settings, label: t('sidebar.settings'), href: "/dashboard/settings" },
    { icon: Shield, label: t('settings.roles.title') || 'Roles', href: "/dashboard/settings/roles" },
    { icon: Shield, label: t('settings.permissions.title') || 'Permissions', href: "/dashboard/settings/permissions" },
    
    { icon: BellRing, label: t('sidebar.notificationSettings'), href: "/dashboard/settings/notifications" },
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

  /** Prefix-aware active check: exact for /dashboard and parent group routes, prefix for everything else */
  const isActive = (path: string) => {
    // Parent/group routes that have child sub-routes need exact matching
    // to prevent false double-highlight (e.g. /dashboard/hr vs /dashboard/hr/payroll)
    if (path === "/dashboard" || path === "/dashboard/hr") {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

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

  // Common collapsed/tooltipSide props for nav items
  const navProps = { collapsed, tooltipSide } as const;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 z-50 bg-gradient-to-b from-cream via-cream to-cream-dark/50 border-border/50 transform transition-all duration-200 shadow-xl lg:shadow-none lg:static lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          sidebarPositionClasses,
          sidebarTransformClasses,
          dir === 'rtl' ? 'border-l' : 'border-r'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close Button */}
          <div className={cn(
            "border-b border-border/50 flex items-center bg-white/50",
            collapsed ? "p-2 flex-col gap-1 justify-center" : "p-5 justify-between gap-3"
          )}>
            <Logo iconOnly={collapsed} size={collapsed ? "sm" : "default"} />
            {/* Desktop collapse toggle — top header */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-xl hover:bg-navy/5 transition-colors hidden lg:flex items-center justify-center"
                  aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                >
                  <ChevronsLeft
                    className={cn(
                      "w-4 h-4 text-navy/50 transition-transform duration-200",
                      collapsed && "rotate-180",
                      dir === "rtl" && "scale-x-[-1]"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide} className="font-medium">
                {collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              </TooltipContent>
            </Tooltip>
            {/* Mobile close button */}
            {!collapsed && (
              <button
                className="p-2 rounded-xl hover:bg-navy/5 lg:hidden transition-colors"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-navy/60" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav ref={navRef} className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-1.5" : "p-3")}>
            {/* Dashboard - always visible */}
            <NavItem
              icon={Home}
              label={t('sidebar.dashboard')}
              href="/dashboard"
              active={isActive("/dashboard")}
              onNavigate={onClose}
              {...navProps}
            />

            {/* PERSONAL WORKSPACE MODE - show personal nav items */}
            {workspaceMode === "personal" && (
              <>
                <NavItem
                  icon={UserCircle}
                  label={t('sidebar.myProfile')}
                  href="/dashboard/my-profile"
                  active={isActive("/dashboard/my-profile")}
                  onNavigate={onClose}
                  {...navProps}
                />
                <NavItem
                  icon={MessageSquare}
                  label={t('sidebar.community')}
                  href="/community"
                  active={isActive("/community")}
                  onNavigate={onClose}
                  {...navProps}
                />
                <NavItem
                  icon={Ticket}
                  label={t('sidebar.myBookings')}
                  href="/dashboard/my-bookings"
                  active={isActive("/dashboard/my-bookings")}
                  onNavigate={onClose}
                  {...navProps}
                />
                <NavItem
                  icon={CreditCard}
                  label={t('sidebar.myPayments')}
                  href="/dashboard/my-payments"
                  active={isActive("/dashboard/my-payments")}
                  onNavigate={onClose}
                  {...navProps}
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
                    {...navProps}
                  />
                )}

                {/* LAB TENANT PRIMARY NAV - Lab sections as top-level items */}
                {isLabTenant && labMode === 'full' && (
                  <>
                    {LAB_NAV_SECTIONS.filter(s => s.key !== 'clients').map((section) => (
                      <NavItem
                        key={section.key}
                        icon={section.icon}
                        label={t(section.labelKey)}
                        href={section.route}
                        active={isLabTabActive(section.tab)}
                        onNavigate={onClose}
                        {...navProps}
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
                    {...navProps}
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
                    {...navProps}
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
                    {...navProps}
                  />
                )}

                <NavItem 
                  icon={Calendar} 
                  label={t('sidebar.schedule')} 
                  href="/dashboard/schedule"
                  active={isActive("/dashboard/schedule")}
                  onNavigate={onClose}
                  {...navProps}
                />
                <NavItem 
                  icon={FileText} 
                  label={t('sidebar.records')} 
                  href="/dashboard/records"
                  active={isActive("/dashboard/records")}
                  onNavigate={onClose}
                  {...navProps}
                />
                
                {/* HR / Team NavGroup - requires team or hr permission */}
                {(hasPermission('team.view') || hasPermission('hr.view')) && (
                  <NavGroup
                    icon={Users}
                    label={t('sidebar.hr')}
                    items={hrNavItems}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}
                
                {/* Housing - requires housing permission AND if housing is enabled */}
                {housingEnabled && hasPermission('housing.view') && (
                  <NavGroup
                    icon={Warehouse}
                    label={t('sidebar.housing')}
                    items={[
                      { icon: Building2, label: t('housing.tabs.branches'), href: "/dashboard/housing?tab=branches" },
                      { icon: Building2, label: t('housing.tabs.facilities'), href: "/dashboard/housing?tab=facilities" },
                      { icon: ClipboardCheck, label: t('housing.tabs.admissions'), href: "/dashboard/housing?tab=admissions" },
                      { icon: ArrowLeftRight, label: t('housing.tabs.arrivalsAndDepartures'), href: "/dashboard/housing?tab=arrivalsAndDepartures" },
                      { icon: ArrowDownToLine, label: t('housing.tabs.incoming'), href: "/dashboard/housing?tab=incoming" },
                    ]}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}

                {/* Services - requires services permission, hidden for Lab-only tenants */}
                {hasPermission('services.view') && !(isLabTenant && labMode === 'full') && (
                  <NavItem
                    icon={Package}
                    label={t('sidebar.services')}
                    href="/dashboard/services"
                    active={isActive("/dashboard/services")}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}
                
                {/* Clients - requires clients permission */}
                {hasPermission('clients.view') && (
                  <NavItem
                    icon={UserCircle}
                    label={t('clients.title')}
                    href="/dashboard/clients"
                    active={isActive("/dashboard/clients")}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}

                {/* Finance NavGroup - requires finance permission */}
                {hasPermission('finance.invoice.view') && (
                  <NavGroup
                    icon={Wallet}
                    label={t('finance.title')}
                    items={financeNavItems}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}

                {/* Files - requires files permission */}
                {hasPermission('files.assets.manage') && (
                  <NavItem
                    icon={FolderOpen}
                    label={t('files.title')}
                    href="/dashboard/files"
                    active={isActive("/dashboard/files")}
                    onNavigate={onClose}
                    {...navProps}
                  />
                )}

                {/* Doctor-specific nav items - requires doctor permission */}
                {hasPermission('doctor.patients.read') && activeTenant?.tenant.type === "doctor" && (
                  <>
                    <NavItem
                      icon={Activity}
                      label={t('sidebar.doctorOverview')}
                      href="/dashboard/doctor"
                      active={isActive("/dashboard/doctor")}
                      onNavigate={onClose}
                      {...navProps}
                    />
                    <NavItem
                      icon={Heart}
                      label={t('sidebar.doctorPatients')}
                      href="/dashboard/doctor/patients"
                      active={isActive("/dashboard/doctor/patients")}
                      onNavigate={onClose}
                      {...navProps}
                    />
                    <NavItem
                      icon={ClipboardList}
                      label={t('sidebar.doctorConsultations')}
                      href="/dashboard/doctor/consultations"
                      active={isActive("/dashboard/doctor/consultations")}
                      onNavigate={onClose}
                      {...navProps}
                    />
                    <NavItem
                      icon={Package}
                      label={t('sidebar.doctorServices')}
                      href="/dashboard/doctor/services"
                      active={isActive("/dashboard/doctor/services")}
                      onNavigate={onClose}
                      {...navProps}
                    />
                  </>
                )}

                {/* Academy sessions & bookings - for academy owners/managers */}
                {hasPermission('bookings.manage') &&
                  activeTenant?.tenant.type === "academy" && (
                    <>
                      <NavItem
                        icon={GraduationCap}
                        label={t('sidebar.sessions')}
                        href="/dashboard/academy/sessions"
                        active={isActive("/dashboard/academy/sessions")}
                        onNavigate={onClose}
                        {...navProps}
                      />
                      <NavItem
                        icon={Ticket}
                        label={t('sidebar.manageBookings')}
                        href="/dashboard/academy/bookings"
                        active={isActive("/dashboard/academy/bookings")}
                        onNavigate={onClose}
                        {...navProps}
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
                    {...navProps}
                  />
                )}

                {/* Settings section */}
                <div className={cn("pt-4 mt-4 border-t border-border/50 space-y-1")}>
                  {hasPermission('admin.members.manage') ? (
                    <NavGroup
                      icon={Settings}
                      label={t('sidebar.settings')}
                      items={settingsNavItems}
                      onNavigate={onClose}
                      {...navProps}
                    />
                  ) : (
                    /* Members without admin permission only see notification settings */
                    <NavItem 
                      icon={BellRing} 
                      label={t('sidebar.notificationSettings')} 
                      href="/dashboard/settings/notifications"
                      active={isActive("/dashboard/settings/notifications")}
                      onNavigate={onClose}
                      {...navProps}
                    />
                  )}
                </div>
              </>
            )}
          </nav>


          {/* User Section — only visible on mobile overlay, hidden on desktop (header has logout) */}
          <div className="p-4 border-t border-border/50 bg-white/30 lg:hidden">
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
    </TooltipProvider>
  );
};
