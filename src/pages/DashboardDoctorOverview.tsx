import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, ClipboardList, Calendar, TrendingUp } from "lucide-react";
import { useConsultations } from "@/hooks/doctor/useConsultations";
import { usePatients } from "@/hooks/doctor/usePatients";
import { useFollowups } from "@/hooks/doctor/useFollowups";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { isToday, isFuture } from "date-fns";
import { formatStandardDate } from "@/lib/displayHelpers";

export default function DashboardDoctorOverview() {
  const { activeTenant } = useTenant();
  const { t } = useI18n();
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
    <DashboardShell>
      <MobilePageHeader title={t('doctor.dashboard')} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('doctor.statPatients')}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />{patients.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('doctor.statActiveConsultations')}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />{activeConsultations.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('doctor.statTodayFollowups')}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />{todayFollowups.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('doctor.statRevenue')}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{totalRevenue.toLocaleString()} SAR</div></CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t('doctor.recentConsultations')}</CardTitle></CardHeader>
            <CardContent>
              {consultations.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{c.horse_name_snapshot || t('common.unknown')}</p>
                    <p className="text-sm text-muted-foreground">{c.consultation_type} · {c.chief_complaint?.slice(0, 40) || t('doctor.noComplaint')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
              {consultations.length === 0 && <p className="text-muted-foreground text-sm">{t('doctor.noConsultationsYet')}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('doctor.upcomingFollowups')}</CardTitle></CardHeader>
            <CardContent>
              {upcomingFollowups.slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatStandardDate(f.followup_date)}</p>
                    <p className="text-sm text-muted-foreground">{f.notes?.slice(0, 50) || t('common.notes')}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{f.status}</span>
                </div>
              ))}
              {upcomingFollowups.length === 0 && <p className="text-muted-foreground text-sm">{t('doctor.noUpcomingFollowups')}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
