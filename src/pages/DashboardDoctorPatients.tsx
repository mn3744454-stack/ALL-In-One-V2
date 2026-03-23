import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Archive, ArchiveRestore } from "lucide-react";
import { usePatients, type DoctorPatient } from "@/hooks/doctor/usePatients";
import { PatientFormDialog } from "@/components/doctor/PatientFormDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DashboardDoctorPatients() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<DoctorPatient | null>(null);
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('doctor-patients');

  const { patients, loading, archivePatient } = usePatients({ search, includeArchived: showArchived });

  const headerRight = (
    <Button onClick={() => { setEditPatient(null); setFormOpen(true); }}>
      <Plus className="h-4 w-4 mr-1" />{t('doctor.addPatient')}
    </Button>
  );

  const renderCard = (p: DoctorPatient) => (
    <Card key={p.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${p.is_archived ? 'opacity-60' : ''}`} onClick={() => { setEditPatient(p); setFormOpen(true); }}>
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BilingualName name={p.name} nameAr={p.name_ar} inline primaryClassName="text-sm" />
            {p.is_archived && <span className="text-xs bg-muted px-2 py-0.5 rounded">{t('doctor.showArchived')}</span>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            {p.breed_text && <span>{p.breed_text}</span>}
            {p.gender && <span>{p.gender}</span>}
            {p.owner_name && <span>{t('doctor.ownerName')}: {p.owner_name}</span>}
            {p.microchip_number && <span>MC: {p.microchip_number}</span>}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          {!p.is_archived && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); archivePatient(p.id); }}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {p.is_archived && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); archivePatient(p.id, false); }}>
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardShell headerRight={headerRight}>
      <MobilePageHeader title={t('doctor.patients')} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('doctor.searchPatients')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
              {showArchived ? t('doctor.hideArchived') : t('doctor.showArchived')}
            </Button>
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
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : patients.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{t('doctor.noPatients')}</CardContent></Card>
        ) : viewMode === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Breed</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Microchip</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id} className={`cursor-pointer ${p.is_archived ? 'opacity-60' : ''}`} onClick={() => { setEditPatient(p); setFormOpen(true); }}>
                  <TableCell>
                    <BilingualName name={p.name} nameAr={p.name_ar} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.breed_text || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">{p.gender || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.owner_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono text-xs">{p.microchip_number || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{p.source}</Badge></TableCell>
                  <TableCell className="w-[60px]">
                    {!p.is_archived ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); archivePatient(p.id); }}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); archivePatient(p.id, false); }}>
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className={getGridClass(gridColumns, viewMode)}>
            {patients.map(renderCard)}
          </div>
        )}
      </div>

      <PatientFormDialog open={formOpen} onOpenChange={setFormOpen} patient={editPatient} />
    </DashboardShell>
  );
}
