import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConsultations, type DoctorConsultation } from "@/hooks/doctor/useConsultations";
import { usePatients } from "@/hooks/doctor/usePatients";
import { useI18n } from "@/i18n";

interface ConsultationFormProps {
  consultation?: DoctorConsultation;
  onSuccess: (id?: string) => void;
  onCancel?: () => void;
}

export function ConsultationForm({ consultation, onSuccess, onCancel }: ConsultationFormProps) {
  const isEdit = !!consultation;
  const { createConsultation, updateConsultation, isCreating, isUpdating } = useConsultations();
  const { patients } = usePatients();
  const { t } = useI18n();

  const [patientId, setPatientId] = useState(consultation?.patient_id || "");
  const [consultationType, setConsultationType] = useState(consultation?.consultation_type || "checkup");
  const [priority, setPriority] = useState(consultation?.priority || "normal");
  const [scheduledFor, setScheduledFor] = useState(consultation?.scheduled_for?.slice(0, 16) || "");
  const [chiefComplaint, setChiefComplaint] = useState(consultation?.chief_complaint || "");
  const [findings, setFindings] = useState(consultation?.findings || "");
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis || "");
  const [recommendations, setRecommendations] = useState(consultation?.recommendations || "");
  const [actualCost, setActualCost] = useState(consultation?.actual_cost?.toString() || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    const data = {
      patient_id: patientId,
      consultation_type: consultationType,
      priority,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      chief_complaint: chiefComplaint || undefined,
      findings: findings || undefined,
      diagnosis: diagnosis || undefined,
      recommendations: recommendations || undefined,
      actual_cost: actualCost ? parseFloat(actualCost) : undefined,
    };

    try {
      if (isEdit && consultation) {
        await updateConsultation(consultation.id, data);
        onSuccess();
      } else {
        const result = await createConsultation(data);
        onSuccess(result.id);
      }
    } catch {}
  };

  return (
    <Card>
      <CardHeader><CardTitle>{isEdit ? t('doctor.editConsultation') : t('doctor.newConsultation')}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('doctor.patient')}</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger><SelectValue placeholder={t('doctor.selectPatient')} /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.owner_name ? ` (${p.owner_name})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {patients.length === 0 && <p className="text-sm text-muted-foreground mt-1">{t('doctor.noPatientsRegistered')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('doctor.type')}</Label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkup">{t('doctor.checkup')}</SelectItem>
                  <SelectItem value="emergency">{t('doctor.emergency')}</SelectItem>
                  <SelectItem value="follow_up">{t('doctor.followUp')}</SelectItem>
                  <SelectItem value="procedure">{t('doctor.procedure')}</SelectItem>
                  <SelectItem value="dental">{t('doctor.dental')}</SelectItem>
                  <SelectItem value="reproductive">{t('doctor.reproductive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('doctor.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('doctor.low')}</SelectItem>
                  <SelectItem value="normal">{t('doctor.normal')}</SelectItem>
                  <SelectItem value="high">{t('doctor.high')}</SelectItem>
                  <SelectItem value="urgent">{t('doctor.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t('doctor.scheduledFor')}</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
          </div>

          <div>
            <Label>{t('doctor.chiefComplaint')}</Label>
            <Textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t('doctor.findings')}</Label>
            <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t('doctor.diagnosis')}</Label>
            <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t('doctor.recommendations')}</Label>
            <Textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>{t('doctor.cost')} ({consultation?.currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0.00" />
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>}
            <Button type="submit" disabled={isCreating || isUpdating || !patientId}>
              {isEdit ? t('common.save') : t('doctor.createConsultation')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
