import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Menu, Search } from "lucide-react";
import { useConsultations } from "@/hooks/doctor/useConsultations";
import { useI18n } from "@/i18n";
import { format } from "date-fns";

export default function DashboardDoctorConsultations() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { consultations, loading } = useConsultations({
    search,
    status: statusFilter || undefined,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobilePageHeader title={t('doctor.consultations')} />
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" />{t('doctor.consultations')}</h1>
          </div>
          <NotificationsPanel />
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('doctor.searchConsultations')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36"><SelectValue placeholder={t('doctor.allStatuses')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('doctor.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('doctor.draft')}</SelectItem>
                  <SelectItem value="scheduled">{t('doctor.scheduled')}</SelectItem>
                  <SelectItem value="in_progress">{t('doctor.inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('doctor.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('doctor.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => navigate("/dashboard/doctor/consultations/new")}>
              <Plus className="h-4 w-4 mr-1" />{t('doctor.newConsultation')}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : consultations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t('doctor.noConsultations')}</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {consultations.map(c => (
                <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/doctor/consultations/${c.id}`)}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{c.horse_name_snapshot || t('doctor.unknownPatient')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || statusColors.draft}`}>{c.status}</span>
                          <span className="text-xs text-muted-foreground">{c.consultation_type}</span>
                          {c.priority !== "normal" && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${c.priority === 'urgent' ? 'bg-red-100 text-red-700' : c.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{c.priority}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{c.chief_complaint || t('doctor.noComplaintRecorded')}</p>
                      </div>
                      <div className="text-sm text-muted-foreground ml-4 text-right whitespace-nowrap">
                        {format(new Date(c.created_at), "MMM d, yyyy")}
                        {c.actual_cost != null && <p className="font-medium text-foreground">{c.actual_cost} {c.currency}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
