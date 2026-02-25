import { useState } from "react";
import { useLocation } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, ClipboardList, Calendar, Menu, TrendingUp } from "lucide-react";
import { useConsultations } from "@/hooks/doctor/useConsultations";
import { usePatients } from "@/hooks/doctor/usePatients";
import { useFollowups } from "@/hooks/doctor/useFollowups";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useTenant } from "@/contexts/TenantContext";
import { format, isToday, isFuture } from "date-fns";

export default function DashboardDoctorOverview() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { consultations } = useConsultations();
  const { patients } = usePatients();
  const { followups } = useFollowups();
  const { invoices } = useInvoices(tenantId);

  const activeConsultations = consultations.filter(c => c.status === "in_progress" || c.status === "scheduled");
  const todayFollowups = followups.filter(f => f.status === "pending" && isToday(new Date(f.followup_date)));
  const upcomingFollowups = followups.filter(f => f.status === "pending" && isFuture(new Date(f.followup_date)));
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobilePageHeader title="Doctor Dashboard" />
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5" />Doctor Dashboard</h1>
              <p className="text-muted-foreground text-sm">Overview of your practice</p>
            </div>
          </div>
          <NotificationsPanel />
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Patients</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />{patients.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Consultations</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />{activeConsultations.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Follow-ups</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />{todayFollowups.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Revenue (Paid)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{totalRevenue.toLocaleString()} SAR</div></CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Consultations */}
            <Card>
              <CardHeader><CardTitle>Recent Consultations</CardTitle></CardHeader>
              <CardContent>
                {consultations.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{c.horse_name_snapshot || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{c.consultation_type} · {c.chief_complaint?.slice(0, 40) || "No complaint"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
                {consultations.length === 0 && <p className="text-muted-foreground text-sm">No consultations yet</p>}
              </CardContent>
            </Card>

            {/* Upcoming Follow-ups */}
            <Card>
              <CardHeader><CardTitle>Upcoming Follow-ups</CardTitle></CardHeader>
              <CardContent>
                {upcomingFollowups.slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(f.followup_date), "MMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{f.notes?.slice(0, 50) || "No notes"}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{f.status}</span>
                  </div>
                ))}
                {upcomingFollowups.length === 0 && <p className="text-muted-foreground text-sm">No upcoming follow-ups</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
