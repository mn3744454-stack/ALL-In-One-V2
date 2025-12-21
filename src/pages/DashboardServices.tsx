import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { ServicesList, ServiceFormDialog } from "@/components/services";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceActive,
  CreateServiceInput,
} from "@/hooks/useServices";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Search,
  Menu,
  LogOut,
  MessageSquare,
  Globe,
  X,
  Package,
  ArrowLeft,
} from "lucide-react";

const DashboardServices = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole } = useTenant();

  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const toggleActive = useToggleServiceActive();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleCreate = async (data: CreateServiceInput) => {
    await createService.mutateAsync(data);
  };

  const handleUpdate = async (data: CreateServiceInput & { id: string }) => {
    await updateService.mutateAsync(data);
  };

  const handleDelete = async (id: string) => {
    await deleteService.mutateAsync(id);
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    await toggleActive.mutateAsync({ id, is_active });
  };

  // Can manage = owner or admin
  const canManage = activeRole === "owner" || activeRole === "admin";

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-navy mb-2">
              No Business Selected
            </h2>
            <p className="text-muted-foreground mb-6">
              Please select or create a business to manage services.
            </p>
            <Button variant="gold" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-navy mb-2">
              Access Restricted
            </h2>
            <p className="text-muted-foreground mb-6">
              Only owners and admins can manage services.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-cream flex overflow-x-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-navy-light flex items-center justify-between">
            <Logo variant="light" />
            <button
              className="p-2 rounded-xl hover:bg-navy-light lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-cream" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem icon={Home} label="Dashboard" href="/dashboard" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={MessageSquare} label="Community" href="/community" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Package} label="Services" active onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Calendar} label="Schedule" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={FileText} label="Records" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Users} label="Team" onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={Building2} label="Facilities" onNavigate={() => setSidebarOpen(false)} />

            {activeRole === "owner" && activeTenant && (
              <NavItem icon={Globe} label="Public Profile" href="/dashboard/public-profile" onNavigate={() => setSidebarOpen(false)} />
            )}

            <div className="pt-4 mt-4 border-t border-navy-light">
              <NavItem icon={Settings} label="Settings" onNavigate={() => setSidebarOpen(false)} />
            </div>
          </nav>

          <div className="p-4 border-t border-navy-light">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-bold shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cream truncate">
                  {activeTenant?.tenant.name || "No Organization"}
                </p>
                <p className="text-xs text-cream/60 capitalize">{activeRole || "Member"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-cream/70 hover:text-cream hover:bg-navy-light"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <button
                className="p-2 rounded-xl hover:bg-muted lg:hidden shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <TenantSwitcher />
              <div className="hidden md:block">
                <RoleSwitcher />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search services..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <InvitationsPanel />
            </div>
          </div>
        </header>

        {/* Services Content */}
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-1">
                Services
              </h1>
              <p className="text-muted-foreground">
                Manage the services your business offers
              </p>
            </div>
            <ServiceFormDialog
              onSubmit={handleCreate}
              isLoading={createService.isPending}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total" value={services.length} />
            <StatCard label="Active" value={services.filter((s) => s.is_active).length} />
            <StatCard label="Public" value={services.filter((s) => s.is_public).length} />
            <StatCard label="Private" value={services.filter((s) => !s.is_public).length} />
          </div>

          {/* Services List */}
          <ServicesList
            services={services}
            isLoading={isLoading}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isCreating={createService.isPending}
            isUpdating={updateService.isPending}
            isDeleting={deleteService.isPending}
          />
        </div>
      </main>
    </div>
  );
};

const NavItem = ({
  icon: Icon,
  label,
  active = false,
  badge,
  href,
  onNavigate,
}: {
  icon: any;
  label: string;
  active?: boolean;
  badge?: number;
  href?: string;
  onNavigate?: () => void;
}) => {
  const className = `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
    active
      ? "bg-gold text-navy"
      : "text-cream/70 hover:text-cream hover:bg-navy-light"
  }`;

  const content = (
    <>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${active ? "bg-navy/20" : "bg-cream/10"}`}>
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={className} onClick={onNavigate}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onNavigate}>
      {content}
    </button>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card variant="elevated">
    <CardContent className="p-4 text-center">
      <p className="text-2xl font-display font-bold text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default DashboardServices;
