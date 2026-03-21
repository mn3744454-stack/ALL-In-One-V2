import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Receipt } from "lucide-react";
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
  const [editing, setEditing] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const { t } = useI18n();

  const { consultation, loading, error } = useConsultation(id);
  const { updateConsultation } = useConsultations();
  const { links } = useBillingLinks("doctor_consultation", id);

  const isNew = id === "new";

  // Build headerRight CTAs (only for detail view, not new)
  const detailCTAs = !isNew && consultation ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Edit className="h-4 w-4 me-1" />{t('common.edit')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setInvoiceDialogOpen(true)}>
        <Receipt className="h-4 w-4 me-1" />{t('doctor.createInvoice')}
      </Button>
    </div>
  ) : undefined;

  if (isNew) {
    return (
      <DashboardShell>
        <MobilePageHeader title={t('doctor.newConsultation')} />
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <ConsultationForm onSuccess={(newId) => navigate(`/dashboard/doctor/consultations/${newId}`, { replace: true })} />
        </div>
      </DashboardShell>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !consultation) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t('doctor.consultationNotFound')}</p>
        </div>
      </DashboardShell>
    );
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
    <DashboardShell headerRight={detailCTAs}>
      <MobilePageHeader title={consultation.horse_name_snapshot || t('doctor.consultations')} />

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
                    <p>{t('doctor.created')}: {formatStandardDate(consultation.created_at)}</p>
                    {consultation.scheduled_for && <p>{t('doctor.scheduledFor')}: {formatStandardDateTime(consultation.scheduled_for)}</p>}
                    {consultation.completed_at && <p>{t('doctor.completed')}: {formatStandardDate(consultation.completed_at)}</p>}
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

      <CreateInvoiceFromConsultation
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        consultation={consultation}
      />
    </DashboardShell>
  );
}
