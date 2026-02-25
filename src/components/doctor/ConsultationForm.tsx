import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConsultations, type DoctorConsultation } from "@/hooks/doctor/useConsultations";
import { usePatients } from "@/hooks/doctor/usePatients";

interface ConsultationFormProps {
  consultation?: DoctorConsultation;
  onSuccess: (id?: string) => void;
  onCancel?: () => void;
}

export function ConsultationForm({ consultation, onSuccess, onCancel }: ConsultationFormProps) {
  const isEdit = !!consultation;
  const { createConsultation, updateConsultation, isCreating, isUpdating } = useConsultations();
  const { patients } = usePatients();

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
      <CardHeader><CardTitle>{isEdit ? "Edit Consultation" : "New Consultation"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.owner_name ? ` (${p.owner_name})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {patients.length === 0 && <p className="text-sm text-muted-foreground mt-1">No patients registered. Add one first.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="reproductive">Reproductive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Scheduled For</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
          </div>

          <div>
            <Label>Chief Complaint</Label>
            <Textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Findings</Label>
            <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Diagnosis</Label>
            <Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Recommendations</Label>
            <Textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Cost ({consultation?.currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0.00" />
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            <Button type="submit" disabled={isCreating || isUpdating || !patientId}>
              {isEdit ? "Save" : "Create Consultation"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
