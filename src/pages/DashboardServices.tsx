import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServicesList, ServiceFormDialog } from "@/components/services";
import { ServicePlansManager } from "@/components/services/ServicePlansManager";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useTenant } from "@/contexts/TenantContext";
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceActive,
  CreateServiceInput,
} from "@/hooks/useServices";
import { useStableServicePlans } from "@/hooks/useStableServicePlans";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { Building2, Package, ArrowLeft, Store, Layers } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

const DashboardServices = () => {
  const navigate = useNavigate();
  const { activeTenant, activeRole } = useTenant();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { labMode } = useModuleAccess();

  const { data: services = [], isLoading } = useServices();
  const { plans } = useStableServicePlans();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const toggleActive = useToggleServiceActive();

  // Route-level Lab guard: full-mode Lab tenants should not access this page
  useEffect(() => {
    if (labMode === 'full') {
      toast.error(t('common.accessRestricted'));
      navigate('/dashboard', { replace: true });
    }
  }, [labMode, navigate, t]);

  if (labMode === 'full') return null;

  const planCountByServiceId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const plan of plans) {
      if (plan.service_id) {
        counts[plan.service_id] = (counts[plan.service_id] || 0) + 1;
      }
    }
    return counts;
  }, [plans]);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'plans') return 'plans';
    return 'catalog';
  }, [searchParams]);

  // Route-level Lab guard: full-mode Lab tenants should not access this page
  useEffect(() => {
    if (labMode === 'full') {
      toast.error(t('common.accessRestricted'));
      navigate('/dashboard', { replace: true });
    }
  }, [labMode, navigate, t]);

  if (labMode === 'full') return null;

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
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

  const canManage = activeRole === "owner" || activeRole === "manager";

  if (!activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card variant="elevated" className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-navy mb-2">
                {t('services.noTenant')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('services.noTenantDesc')}
              </p>
              <Button variant="gold" onClick={() => navigate("/dashboard")}>
                {t('common.goToDashboard')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  if (!canManage) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card variant="elevated" className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-navy mb-2">
                {t('common.accessRestricted')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('services.accessRestrictedDesc')}
              </p>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToDashboard')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <MobilePageHeader title={t("nav.services")} backTo="/dashboard" />

      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-1">
              {t('nav.services')}
            </h1>
            <p className="text-muted-foreground">
              {t('services.subtitle')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog" className="gap-2">
              <Store className="h-4 w-4" />
              {t('services.tabs.catalog')}
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Layers className="h-4 w-4" />
              {t('services.tabs.plans')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-0">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label={t('common.total')} value={services.length} />
              <StatCard label={t('common.active')} value={services.filter((s) => s.is_active).length} />
              <StatCard label={t('services.public')} value={services.filter((s) => s.is_public).length} />
              <StatCard label={t('services.private')} value={services.filter((s) => !s.is_public).length} />
            </div>

            <div className="flex justify-end mb-4">
              <ServiceFormDialog
                onSubmit={handleCreate}
                isLoading={createService.isPending}
              />
            </div>

            <ServicesList
              services={services}
              isLoading={isLoading}
              planCountByServiceId={planCountByServiceId}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              isCreating={createService.isPending}
              isUpdating={updateService.isPending}
              isDeleting={deleteService.isPending}
            />
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <ServicePlansManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
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
