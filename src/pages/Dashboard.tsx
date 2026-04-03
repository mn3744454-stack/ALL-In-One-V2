import { useState } from "react";
import { AddHorseDialog } from "@/components/AddHorseDialog";
import { Link, useNavigate } from "react-router-dom";
import { useTenantRealtimeSync } from "@/hooks/useTenantRealtimeSync";
import { useFocusRefresh } from "@/hooks/useFocusRefresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceModeToggle } from "@/components/WorkspaceModeToggle";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { PushPermissionBanner } from "@/components/push/PushPermissionBanner";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { UpcomingScheduleWidget } from "@/components/dashboard/UpcomingScheduleWidget";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { FinancialSummaryWidget } from "@/components/dashboard/FinancialSummaryWidget";
import { BoardingDashboardWidgets } from "@/components/housing/BoardingDashboardWidgets";
import { MobileHomeGrid, MobileBottomNav, MobileLauncher } from "@/components/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import {
  Building2,
  Search,
  TrendingUp,
  Heart,
  Activity,
  ChevronRight,
  Globe,
  Settings,
  ExternalLink,
  AlertCircle,
  Users,
  Calendar,
  CreditCard,
  ShoppingCart,
  Star,
  UserCircle,
} from "lucide-react";
import { LanguageSelector } from "@/components/ui/language-selector";


const Dashboard = () => {
  // Platform-wide realtime subscriptions + safe focus recovery
  useTenantRealtimeSync();
  useFocusRefresh();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeTenant, activeRole, tenants, loading: tenantsLoading, workspaceMode } = useTenant();
  const { horses, loading: horsesLoading } = useHorses();
  const { t, lang } = useI18n();

  // Check if public profile needs setup (owner with no slug) - ONLY in org mode
  const needsPublicProfileSetup = workspaceMode === "organization" && activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;
  const hasPublicProfile = workspaceMode === "organization" && activeTenant?.tenant.slug && activeTenant?.tenant.is_public;
  
  // Check if personal profile needs completion - ONLY in personal mode
  const needsPersonalProfileSetup = workspaceMode === "personal" && profile && !(profile as any).bio && !(profile as any).location;

  // Check if user has no tenants - show welcome section in dashboard instead
  const hasNoTenants = !tenantsLoading && tenants.length === 0;

  // Determine if this tenant type "owns" horses (stable-centric feature)
  const tenantType = activeTenant?.tenant.type;
  const isHorseOwningTenant = !tenantType || tenantType === 'stable' || tenantType === 'academy';

  return (
    <DashboardShell>
      {/* Mobile Header - Dashboard-specific with workspace toggle */}
      <header className="shrink-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 lg:hidden">
        {/* Row 1: Workspace toggle (wider area) + actions */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/30">
          <WorkspaceModeToggle />
          <div className="flex items-center gap-1.5">
            <LanguageSelector />
          </div>
        </div>
        
        {/* Row 2: Tenant/role context - only in organization mode */}
        {workspaceMode === "organization" && (
          <div className="flex items-center justify-between h-12 px-4 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TenantSwitcher />
              <RoleSwitcher />
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Push Permission Banner */}
        <PushPermissionBanner />
        {/* Dashboard Content */}
        <div className="p-4 lg:p-8">
          {/* Welcome Section + Search + Mobile Notifications */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-1">
                  {(() => {
                    const isAr = t("_locale") === "ar";
                    const rawName = isAr
                      ? ((profile as any)?.full_name_ar || profile?.full_name)
                      : (profile?.full_name || (profile as any)?.full_name_ar);
                    const firstName = rawName ? rawName.split(" ")[0] : null;
                    return firstName
                      ? t("dashboard.welcomeName").replace("{{name}}", firstName)
                      : t("dashboard.welcome");
                  })()}
                </h1>
                {/* Mobile notifications bell - moved here from top row */}
                <div className="lg:hidden mb-1">
                  <NotificationsPanel />
                </div>
              </div>
              <p className="text-muted-foreground">
                {activeTenant
                  ? t("dashboard.todayAt").replace("{{org}}", activeTenant.tenant.name)
                  : t("dashboard.noTenantMessage")}
              </p>
            </div>
            {/* Desktop search bar - in greeting row */}
            <div className="hidden lg:block flex-shrink-0">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("dashboard.searchPlaceholder")}
                  className="w-64 h-10 ps-10 pe-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>
          </div>

          {/* Mobile Home Grid - Quick access to all modules */}
          <MobileHomeGrid className="mb-8" />

          {/* Personal Quick Actions - desktop only (mobile uses MobileHomeGrid above) */}
          {workspaceMode === "personal" && (
            <div className="hidden lg:block mb-8">
              <h2 className="font-display text-lg font-semibold text-navy mb-4">
                {t("dashboard.quickActions")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <Link to="/dashboard/my-profile" className="block">
                  <Card variant="elevated" className="hover:border-gold/50 hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                        <UserCircle className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy">{t("sidebar.myProfile")}</h3>
                        <p className="text-sm text-muted-foreground">{t("dashboard.myProfileDesc")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link to="/community" className="block">
                  <Card variant="elevated" className="hover:border-gold/50 hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy">{t("sidebar.community")}</h3>
                        <p className="text-sm text-muted-foreground">{t("dashboard.communityDesc")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link to="/dashboard/my-bookings" className="block">
                  <Card variant="elevated" className="hover:border-gold/50 hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy">{t("sidebar.myBookings")}</h3>
                        <p className="text-sm text-muted-foreground">{t("dashboard.myBookingsDesc")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link to="/dashboard/my-payments" className="block">
                  <Card variant="elevated" className="hover:border-gold/50 hover:shadow-lg transition-all cursor-pointer h-full">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy">{t("sidebar.myPayments")}</h3>
                        <p className="text-sm text-muted-foreground">{t("dashboard.myPaymentsDesc")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {/* Favorites - Coming Soon */}
                <button
                  onClick={() => toast.info(t("common.comingSoon"))}
                  className="block text-left w-full"
                >
                  <Card variant="elevated" className="hover:border-muted-foreground/30 transition-all cursor-pointer h-full opacity-75">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Star className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy">{t("sidebar.favorites")}</h3>
                        <p className="text-sm text-muted-foreground">{t("common.comingSoon")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>
            </div>
          )}

          {/* Getting Started Card - Only show when no tenants */}
          {hasNoTenants && (
            <Card variant="elevated" className="mb-8 border-gold/20 bg-gradient-to-r from-gold/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      {t("dashboard.getStarted")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.getStartedDesc")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                      variant="gold"
                      onClick={() => navigate("/select-role")}
                      className="gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      {t("dashboard.createOrganization")}
                    </Button>
                    <NotificationsPanel />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Profile Completion CTA - personal mode only */}
          {needsPersonalProfileSetup && (
            <Card variant="elevated" className="mb-8 border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0">
                    <UserCircle className="w-7 h-7 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      {t("dashboard.completePersonalProfile")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.completePersonalProfileDesc")}
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    onClick={() => navigate("/dashboard/my-profile")}
                    className="gap-2"
                  >
                    <UserCircle className="w-4 h-4" />
                    {t("dashboard.completeNow")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public Profile Setup Reminder - org mode only */}
          {needsPublicProfileSetup && (
            <Card variant="elevated" className="mb-8 border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-7 h-7 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      {t("dashboard.completePublicProfile")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.publicProfileDesc")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard/public-profile")}
                    className="gap-2 border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
                  >
                    <Globe className="w-4 h-4" />
                    {t("dashboard.setUpNow")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Public Profile Button */}
          {hasPublicProfile && (
            <Card variant="elevated" className="mb-8 border-success/30 bg-gradient-to-r from-success/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                    <Globe className="w-7 h-7 text-success" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-navy mb-1">
                      {t("dashboard.publicProfileLive")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t("dashboard.publicProfileLiveDesc")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard/public-profile")}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      {t("dashboard.editProfile")}
                    </Button>
                    <Button
                      variant="gold"
                      onClick={() => window.open(`/tenant/${activeTenant.tenant.slug}`, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("dashboard.viewPublicPage")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid - Only show in organization mode */}
          {workspaceMode === "organization" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {isHorseOwningTenant && (
                <StatCard
                  icon={Heart}
                  label={t("dashboard.totalHorses")}
                  value={horses.length.toString()}
                  change={horses.length > 0 ? t("dashboard.activeRecords") : t("dashboard.addFirstHorse")}
                />
              )}
              <StatCard
                icon={Activity}
                label={t("dashboard.healthCheckups")}
                value="0"
                change={t("dashboard.scheduledThisWeek")}
              />
              <StatCard
                icon={Users}
                label={t("dashboard.teamMembers")}
                value="1"
                change={t("common.active")}
              />
              <StatCard
                icon={TrendingUp}
                label={t("dashboard.thisMonth")}
                value="—"
                change={t("dashboard.statsComingSoon")}
              />
            </div>
          )}

          {/* Dashboard Widgets - Only show for users with a tenant in organization mode */}
          {activeTenant && workspaceMode === "organization" && (
            <>
              {/* Boarding Stats Widgets */}
              <div className="mb-6">
                <BoardingDashboardWidgets />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <UpcomingScheduleWidget />
                <RecentActivityWidget />
                <FinancialSummaryWidget />
              </div>
            </>
          )}

          {/* Content Grid - Only in organization mode */}
          {workspaceMode === "organization" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Horses List - Only show for horse-owning tenant types */}
            {activeTenant && isHorseOwningTenant ? (
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-navy">{t("dashboard.yourHorses")}</CardTitle>
                    <Link to="/dashboard/horses" className="text-sm text-gold hover:text-gold-dark font-medium flex items-center gap-1">
                      {t("dashboard.viewAll")} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {horsesLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {t("dashboard.loadingHorses")}
                      </div>
                    ) : horses.length === 0 ? (
                      <div className="py-8 text-center">
                        <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground mb-4">{t("dashboard.noHorsesYet")}</p>
                        <AddHorseDialog
                          trigger={
                            <Button variant="outline" size="sm">
                              {t("dashboard.addYourFirstHorse")}
                            </Button>
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {horses.slice(0, 5).map((horse) => (
                          <HorseItem
                            key={horse.id}
                            name={horse.name}
                            breed={horse.breed || t("common.unknown")}
                            gender={horse.gender}
                            status={t("common.active")}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : !activeTenant ? (
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("dashboard.availableServices")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      {t("dashboard.exploreServices")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ServiceCard
                        icon={Building2}
                        title={t("dashboard.stableManagement")}
                        description={t("dashboard.stableManagementDesc")}
                      />
                      <ServiceCard
                        icon={Heart}
                        title={t("dashboard.horseOwner")}
                        description={t("dashboard.horseOwnerDesc")}
                      />
                      <ServiceCard
                        icon={Activity}
                        title={t("dashboard.vetClinic")}
                        description={t("dashboard.vetClinicDesc")}
                      />
                      <ServiceCard
                        icon={Users}
                        title={t("dashboard.trainingAcademy")}
                        description={t("dashboard.trainingAcademyDesc")}
                      />
                    </div>
                    <Button
                      variant="gold"
                      className="w-full mt-6"
                      onClick={() => navigate("/select-role")}
                    >
                      {t("dashboard.startFreeTrial")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("dashboard.overview")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      {t("dashboard.welcomeMessage").replace("{{name}}", activeTenant?.tenant.name || "")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Upcoming Events */}
            <div>
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="text-navy">{t("dashboard.upcoming")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="py-8 text-center text-muted-foreground">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p>{t("dashboard.noUpcomingEvents")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onOpenLauncher={() => setLauncherOpen(true)} />
      
      {/* Mobile Launcher Drawer */}
      <MobileLauncher open={launcherOpen} onOpenChange={setLauncherOpen} />
    </DashboardShell>
  );
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  positive,
  currency
}: { 
  icon: any; 
  label: string; 
  value: string; 
  change: string;
  positive?: boolean;
  currency?: string;
}) => (
  <Card variant="elevated">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-display font-bold text-navy">
            {currency && <span className="text-base text-muted-foreground mr-1">{currency}</span>}
            {value}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gold" />
        </div>
      </div>
      <p className={`text-xs mt-2 ${positive ? "text-success" : "text-muted-foreground"}`}>
        {change}
      </p>
    </CardContent>
  </Card>
);

const HorseItem = ({ 
  name, 
  breed, 
  gender, 
  status,
  warning = false
}: { 
  name: string; 
  breed: string; 
  gender: string; 
  status: string;
  warning?: boolean;
}) => (
  <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy font-bold">
      {name[0]}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-navy">{name}</p>
      <p className="text-sm text-muted-foreground capitalize">{breed} • {gender}</p>
    </div>
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
      warning 
        ? "bg-warning/10 text-warning" 
        : "bg-success/10 text-success"
    }`}>
      {status}
    </span>
  </div>
);

const ServiceCard = ({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) => (
  <div className="p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer">
    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-gold" />
    </div>
    <h4 className="font-semibold text-navy mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Dashboard;
