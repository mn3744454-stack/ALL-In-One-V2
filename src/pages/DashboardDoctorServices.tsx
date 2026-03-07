import { useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Menu, Edit } from "lucide-react";
import { useDoctorServices, type DoctorService } from "@/hooks/doctor/useDoctorServices";
import { ServiceFormDialog } from "@/components/doctor/ServiceFormDialog";
import { useI18n } from "@/i18n";

export default function DashboardDoctorServices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editService, setEditService] = useState<DoctorService | null>(null);
  const location = useLocation();
  const { t } = useI18n();

  const { services, loading, toggleActive } = useDoctorServices(showInactive);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobilePageHeader title={t('doctor.services')} />
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5" />{t('doctor.services')}</h1>
          </div>
          <NotificationsPanel />
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} />{t('doctor.showInactive')}
            </label>
            <Button onClick={() => { setEditService(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />{t('doctor.addService')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : services.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t('doctor.noServices')}</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <Card key={s.id} className={`${!s.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{s.name}</h3>
                        {s.name_ar && <p className="text-sm text-muted-foreground">{s.name_ar}</p>}
                        {s.category && <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{s.category}</span>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { setEditService(s); setFormOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mt-2">{s.description}</p>}
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-semibold">{s.base_price} {s.currency}</span>
                      <Switch checked={s.is_active} onCheckedChange={(checked) => toggleActive(s.id, checked)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editService} />
    </div>
  );
}
