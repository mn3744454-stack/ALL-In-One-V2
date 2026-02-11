import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { ServicesList, ServiceFormDialog } from "@/components/services";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useTenant } from "@/contexts/TenantContext";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceActive,
  CreateServiceInput,
} from "@/hooks/useServices";
import { Building2, Menu, Search, Package, ArrowLeft } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardServices = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { activeTenant, activeRole } = useTenant();
  const { t } = useI18n();

  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const toggleActive = useToggleServiceActive();

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

  // Can manage = owner or manager
  const canManage = activeRole === "owner" || activeRole === "manager";

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
              Only owners and managers can manage services.
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
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 min-h-screen min-w-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("nav.services")} backTo="/dashboard" />

        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
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
                  className="w-64 h-10 ps-10 pe-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <NotificationsPanel />
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

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card variant="elevated">
    <CardContent className="p-4 text-center">
      <p className="text-2xl font-display font-bold text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

export default DashboardServices;
