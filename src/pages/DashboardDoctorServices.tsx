import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit } from "lucide-react";
import { useDoctorServices, type DoctorService } from "@/hooks/doctor/useDoctorServices";
import { ServiceFormDialog } from "@/components/doctor/ServiceFormDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DashboardDoctorServices() {
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editService, setEditService] = useState<DoctorService | null>(null);
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('doctor-services');

  const { services, loading, toggleActive } = useDoctorServices(showInactive);

  const headerRight = (
    <Button onClick={() => { setEditService(null); setFormOpen(true); }}>
      <Plus className="h-4 w-4 mr-1" />{t('doctor.addService')}
    </Button>
  );

  const renderCard = (s: DoctorService) => (
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
  );

  return (
    <DashboardShell headerRight={headerRight}>
      <MobilePageHeader title={t('doctor.services')} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />{t('doctor.showInactive')}
          </label>
          <div className="hidden md:block">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : services.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{t('doctor.noServices')}</CardContent></Card>
        ) : viewMode === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="whitespace-nowrap">Base Price</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    <div>
                      {s.name}
                      {s.name_ar && <span className="text-muted-foreground text-xs ms-1">({s.name_ar})</span>}
                    </div>
                  </TableCell>
                  <TableCell>{s.category ? <Badge variant="outline" className="text-xs">{s.category}</Badge> : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.base_price} {s.currency}</TableCell>
                  <TableCell><Switch checked={s.is_active} onCheckedChange={(checked) => toggleActive(s.id, checked)} /></TableCell>
                  <TableCell className="w-[60px]">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditService(s); setFormOpen(true); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className={getGridClass(gridColumns, viewMode)}>
            {services.map(renderCard)}
          </div>
        )}
      </div>

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editService} />
    </DashboardShell>
  );
}
