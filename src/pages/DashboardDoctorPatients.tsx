import { useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Plus, Menu, Search, Archive, ArchiveRestore } from "lucide-react";
import { usePatients, type DoctorPatient } from "@/hooks/doctor/usePatients";
import { PatientFormDialog } from "@/components/doctor/PatientFormDialog";

export default function DashboardDoctorPatients() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<DoctorPatient | null>(null);
  const location = useLocation();

  const { patients, loading, archivePatient } = usePatients({ search, includeArchived: showArchived });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobilePageHeader title="Patients" />
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="h-5 w-5" />Patients</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsPanel />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
                {showArchived ? "Hide Archived" : "Show Archived"}
              </Button>
              <Button onClick={() => { setEditPatient(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Patient
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : patients.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No patients found. Add your first patient to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {patients.map(p => (
                <Card key={p.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${p.is_archived ? 'opacity-60' : ''}`} onClick={() => { setEditPatient(p); setFormOpen(true); }}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{p.name}</p>
                        {p.name_ar && <span className="text-muted-foreground text-sm">({p.name_ar})</span>}
                        {p.is_archived && <span className="text-xs bg-muted px-2 py-0.5 rounded">Archived</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {p.breed_text && <span>{p.breed_text}</span>}
                        {p.gender && <span>{p.gender}</span>}
                        {p.owner_name && <span>Owner: {p.owner_name}</span>}
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
              ))}
            </div>
          )}
        </div>
      </div>

      <PatientFormDialog open={formOpen} onOpenChange={setFormOpen} patient={editPatient} />
    </div>
  );
}
