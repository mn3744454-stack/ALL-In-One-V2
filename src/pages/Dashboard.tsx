import { useState } from "react";
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
import { ChevronRight, Heart, Plus, Users, Building2, Briefcase, Clock, DollarSign, AlertTriangle, TrendingUp, Calendar, ArrowUpRight, Activity, Shield, Stethoscope, FlaskConical, GraduationCap, LucideIcon } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Local helper: compact quick-action button used in the desktop sidebar
function QuickActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full justify-start gap-2 h-auto py-2.5"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}

// Local helper: tile-style module card used in the mobile launcher grid
function ModuleCard({
  icon: Icon,
  label,
  onClick,
  color = "primary",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: "primary" | "success" | "warning" | "info";
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/40 transition-colors"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-center text-foreground">{label}</span>
    </button>
  );
}

function HorseItem({ name, breed, gender, status }: { name: string; breed: string; gender: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{breed} · {gender === "male" ? "♂" : "♀"}</p>
        </div>
      </div>
      <span className="text-xs font-medium text-primary">{status}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeTenant, workspaceMode } = useTenant();
  const { horses, loading: horsesLoading } = useHorses();
  const { unreadCount } = useNotifications();
  const {
    isStable,
    isDoctor,
    isAcademy,
    vetEnabled,
    housingEnabled,
    movementEnabled,
    breedingEnabled,
    canViewLabRequests,
  } = useModuleAccess();
  const { hasPermission } = usePermissions();

  useTenantRealtimeSync();
  useFocusRefresh();

  // Track which modules are available
  const hasHorses = !!activeTenant && isStable;
  const hasClients = !!activeTenant;
  const hasFinance = !!activeTenant;
  const hasHousing = !!activeTenant && housingEnabled;
  const hasVet = !!activeTenant && vetEnabled;
  const hasLab = !!activeTenant && canViewLabRequests;
  const hasBreeding = !!activeTenant && breedingEnabled;
  const hasDoctor = !!activeTenant && isDoctor;
  const hasMovement = !!activeTenant && movementEnabled;
  const hasAcademy = !!activeTenant && isAcademy;
  const hasHR = !!activeTenant;
  const hasTeam = !!activeTenant;

  // Permission-gated quick actions (canonical usePermissions hook)
  const canManageHorses = hasPermission('horses.manage');
  const canManageClients = hasPermission('clients.manage');
  const canCreateInvoice = hasPermission('invoices.create');
  const canManageServices = hasPermission('services.manage');
  const canViewHousing = hasPermission('housing.view');
  const canViewVet = hasPermission('vet.view');
  const canViewLab = hasPermission('laboratory.view');
  const canViewMovement = hasPermission('movement.view');

  const tenantType = activeTenant?.tenant?.type as string | undefined;
  const isHorseOwningTenant = tenantType === 'stable' || tenantType === 'breeding' || tenantType === 'training';

  return (
    <DashboardShell>
      {/* Mobile Header - Fixed at top */}
      <div className="lg:hidden">
        <MobileHomeGrid />
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden lg:block p-6 xl:p-8">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-6 mb-8">
          {/* Top Row: Welcome + Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy">{t("dashboard.welcome")}</h1>
              <p className="text-muted-foreground mt-1">
                {activeTenant?.tenant?.name || t("dashboard.noTenant")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationsPanel />
              {workspaceMode === "organization" && (
                <>
                  <TenantSwitcher />
                  <RoleSwitcher />
                </>
              )}
              <WorkspaceModeToggle />
            </div>
          </div>

          {/* Push Permission Banner */}
          <PushPermissionBanner />

          {/* Stats Overview - Only in organization mode */}
          {workspaceMode === "organization" && activeTenant && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy">{horses.length}</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard.horses")}</p>
                    </div>
                  </div>
                </Card>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy">--</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard.clients")}</p>
                    </div>
                  </div>
                </Card>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy">--</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard.revenue")}</p>
                    </div>
                  </div>
                </Card>
                <Card variant="elevated" className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy">--</p>
                      <p className="text-sm text-muted-foreground">{t("dashboard.events")}</p>
                    </div>
                  </div>
                </Card>
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
                        <Link to="/dashboard/horses">
                          <Button variant="outline" size="sm">
                            {t("dashboard.addYourFirstHorse")}
                          </Button>
                        </Link>
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
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">{t("dashboard.noTenantDesc")}</p>
                      <Button onClick={() => navigate("/select-role")}>
                        {t("dashboard.joinOrCreate")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="lg:col-span-2">
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("dashboard.quickActions")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {hasTeam && (
                        <QuickActionButton
                          icon={Users}
                          label={t("dashboard.manageTeam")}
                          onClick={() => navigate("/dashboard/team-partners")}
                        />
                      )}
                      {canManageServices && (
                        <QuickActionButton
                          icon={Briefcase}
                          label={t("dashboard.manageServices")}
                          onClick={() => navigate("/dashboard/services")}
                        />
                      )}
                      {canManageClients && (
                        <QuickActionButton
                          icon={Users}
                          label={t("dashboard.manageClients")}
                          onClick={() => navigate("/dashboard/clients")}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Right Sidebar - Quick Actions & Modules */}
            <div className="space-y-6">
              {/* Quick Actions */}
              {workspaceMode === "organization" && activeTenant && (
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("dashboard.quickActions")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {canManageHorses && isHorseOwningTenant && (
                      <QuickActionButton
                        icon={Plus}
                        label={t("dashboard.addHorse")}
                        onClick={() => navigate("/dashboard/horses")}
                      />
                    )}
                    {canManageClients && (
                      <QuickActionButton
                        icon={Users}
                        label={t("dashboard.addClient")}
                        onClick={() => navigate("/dashboard/clients")}
                      />
                    )}
                    {canCreateInvoice && (
                      <QuickActionButton
                        icon={DollarSign}
                        label={t("dashboard.createInvoice")}
                        onClick={() => navigate("/dashboard/finance/invoices")}
                      />
                    )}
                    {canViewHousing && hasHousing && (
                      <QuickActionButton
                        icon={Building2}
                        label={t("dashboard.checkHousing")}
                        onClick={() => navigate("/dashboard/housing")}
                      />
                    )}
                    {canViewVet && hasVet && (
                      <QuickActionButton
                        icon={Stethoscope}
                        label={t("dashboard.vetRecords")}
                        onClick={() => navigate("/dashboard/vet")}
                      />
                    )}
                    {canViewLab && hasLab && (
                      <QuickActionButton
                        icon={FlaskConical}
                        label={t("dashboard.labSamples")}
                        onClick={() => navigate("/dashboard/laboratory")}
                      />
                    )}
                    {canViewMovement && hasMovement && (
                      <QuickActionButton
                        icon={ArrowUpRight}
                        label={t("dashboard.movement")}
                        onClick={() => navigate("/dashboard/movement")}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Module Access Cards */}
              {workspaceMode === "organization" && activeTenant && (
                <>
                  {hasHousing && <BoardingDashboardWidgets />}
                  {hasHorses && <StableServicePlansCard />}
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Mobile Dashboard Content */}
      <div className="lg:hidden">
        <div className="px-4 pb-24 space-y-6">
          {/* Stats Row */}
          {workspaceMode === "organization" && activeTenant && (
            <div className="grid grid-cols-2 gap-3">
              <Card variant="elevated" className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy">{horses.length}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.horses")}</p>
                  </div>
                </div>
              </Card>
              <Card variant="elevated" className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy">--</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.clients")}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Quick Actions Grid */}
          {workspaceMode === "organization" && activeTenant && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {canManageHorses && isHorseOwningTenant && (
                <ModuleCard
                  icon={Heart}
                  label={t("sidebar.myHorses")}
                  onClick={() => navigate("/dashboard/horses")}
                  color="primary"
                />
              )}
              {canManageClients && (
                <ModuleCard
                  icon={Users}
                  label={t("sidebar.clients")}
                  onClick={() => navigate("/dashboard/clients")}
                  color="success"
                />
              )}
              {canCreateInvoice && (
                <ModuleCard
                  icon={DollarSign}
                  label={t("sidebar.finance")}
                  onClick={() => navigate("/dashboard/finance")}
                  color="warning"
                />
              )}
              {canViewHousing && hasHousing && (
                <ModuleCard
                  icon={Building2}
                  label={t("sidebar.housing")}
                  onClick={() => navigate("/dashboard/housing")}
                  color="info"
                />
              )}
              {canViewVet && hasVet && (
                <ModuleCard
                  icon={Stethoscope}
                  label={t("sidebar.vet")}
                  onClick={() => navigate("/dashboard/vet")}
                  color="primary"
                />
              )}
              {canViewLab && hasLab && (
                <ModuleCard
                  icon={FlaskConical}
                  label={t("sidebar.laboratory")}
                  onClick={() => navigate("/dashboard/laboratory")}
                  color="info"
                />
              )}
              {hasMovement && (
                <ModuleCard
                  icon={ArrowUpRight}
                  label={t("sidebar.movement")}
                  onClick={() => navigate("/dashboard/movement")}
                  color="success"
                />
              )}
              {hasDoctor && (
                <ModuleCard
                  icon={Shield}
                  label={t("sidebar.doctor")}
                  onClick={() => navigate("/dashboard/doctor")}
                  color="primary"
                />
              )}
              {hasBreeding && (
                <ModuleCard
                  icon={Activity}
                  label={t("sidebar.breeding")}
                  onClick={() => navigate("/dashboard/breeding")}
                  color="warning"
                />
              )}
              {hasAcademy && (
                <ModuleCard
                  icon={GraduationCap}
                  label={t("sidebar.academy")}
                  onClick={() => navigate("/dashboard/academy")}
                  color="info"
                />
              )}
              {hasHR && (
                <ModuleCard
                  icon={Users}
                  label={t("sidebar.hr")}
                  onClick={() => navigate("/dashboard/hr")}
                  color="success"
                />
              )}
            </div>
          )}

          {/* Recent Activity */}
          {workspaceMode === "organization" && activeTenant && (
            <RecentActivityWidget />
          )}
        </div>
        <MobileBottomNav />
      </div>
    </DashboardShell>
  );
}
