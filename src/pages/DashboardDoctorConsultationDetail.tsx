import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Menu, Edit, Receipt } from "lucide-react";
import { useConsultation, useConsultations } from "@/hooks/doctor/useConsultations";
import { PrescriptionList } from "@/components/doctor/PrescriptionList";
import { FollowupList } from "@/components/doctor/FollowupList";
import { ConsultationForm } from "@/components/doctor/ConsultationForm";
import { CreateInvoiceFromConsultation } from "@/components/doctor/CreateInvoiceFromConsultation";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";

export default function DashboardDoctorConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const { t } = useI18n();

  const { consultation, loading, error } = useConsultation(id);
  const { updateConsultation } = useConsultations();
  const { links } = useBillingLinks("doctor_consultation", id);

  const isNew = id === "new";

  if (isNew) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          <MobilePageHeader title={t('doctor.newConsultation')} />
          <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/doctor/consultations")}><ArrowLeft className="h-4 w-4 mr-1" />{t('common.back')}</Button>
              <h1 className="text-xl font-bold">{t('doctor.newConsultation')}</h1>
            </div>
            <NotificationsPanel />
          </header>
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <ConsultationForm onSuccess={(newId) => navigate(`/dashboard/doctor/consultations/${newId}`, { replace: true })} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (error || !consultation) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><p className="text-muted-foreground">{t('doctor.consultationNotFound')}</p></div>;
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    draft: t('doctor.draft'),
    scheduled: t('doctor.scheduled'),
    in_progress: t('doctor.inProgress'),
    completed: t('doctor.completed'),
    cancelled: t('doctor.cancelled'),
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentPath={location.pathname} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <MobilePageHeader title={consultation.horse_name_snapshot || t('doctor.consultations')} />
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/doctor/consultations")}><ArrowLeft className="h-4 w-4 mr-1" />{t('common.back')}</Button>
            <h1 className="text-xl font-bold">{consultation.horse_name_snapshot || t('doctor.consultationDetail')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="h-4 w-4 mr-1" />{t('common.edit')}</Button>
            <Button variant="outline" size="sm" onClick={() => setInvoiceDialogOpen(true)}><Receipt className="h-4 w-4 mr-1" />{t('doctor.createInvoice')}</Button>
            <NotificationsPanel />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          {editing ? (
            <Card>
              <CardContent className="pt-6">
                <ConsultationForm
                  consultation={consultation}
                  onSuccess={() => setEditing(false)}
                  onCancel={() => setEditing(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{consultation.horse_name_snapshot}</h2>
                      {consultation.horse_name_ar_snapshot && <p className="text-muted-foreground">{consultation.horse_name_ar_snapshot}</p>}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge className={statusColors[consultation.status]}>{statusLabels[consultation.status] || consultation.status}</Badge>
                        <Badge variant="outline">{consultation.consultation_type}</Badge>
                        {consultation.priority !== "normal" && <Badge variant="destructive">{consultation.priority}</Badge>}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{t('doctor.created')}: {format(new Date(consultation.created_at), "MMM d, yyyy")}</p>
                      {consultation.scheduled_for && <p>{t('doctor.scheduledFor')}: {format(new Date(consultation.scheduled_for), "MMM d, yyyy HH:mm")}</p>}
                      {consultation.completed_at && <p>{t('doctor.completed')}: {format(new Date(consultation.completed_at), "MMM d, yyyy")}</p>}
                      {consultation.actual_cost != null && <p className="font-medium text-foreground text-base mt-1">{consultation.actual_cost} {consultation.currency}</p>}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('doctor.chiefComplaint')}</p>
                      <p className="mt-1">{consultation.chief_complaint || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('doctor.findings')}</p>
                      <p className="mt-1">{consultation.findings || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('doctor.diagnosis')}</p>
                      <p className="mt-1">{consultation.diagnosis || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('doctor.recommendations')}</p>
                      <p className="mt-1">{consultation.recommendations || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t('doctor.updateStatus')}</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(["draft", "scheduled", "in_progress", "completed", "cancelled"] as const).map(s => (
                    <Button
                      key={s}
                      variant={consultation.status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConsultation(consultation.id, {
                        status: s,
                        completed_at: s === "completed" ? new Date().toISOString() : consultation.completed_at,
                      })}
                    >
                      {statusLabels[s] || s}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <PrescriptionList consultationId={consultation.id} />
              <FollowupList consultationId={consultation.id} />

              {links.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">{t('doctor.linkedInvoices')}</CardTitle></CardHeader>
                  <CardContent>
                    {links.map(link => (
                      <div key={link.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm">{link.link_kind} — Invoice {link.invoice_id.slice(0, 8)}...</span>
                        <span className="text-sm font-medium">{link.amount != null ? `${link.amount} SAR` : "—"}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <CreateInvoiceFromConsultation
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        consultation={consultation}
      />
    </div>
  );
}
