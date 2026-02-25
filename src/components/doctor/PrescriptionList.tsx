import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { usePrescriptions } from "@/hooks/doctor/usePrescriptions";

interface PrescriptionListProps {
  consultationId: string;
}

export function PrescriptionList({ consultationId }: PrescriptionListProps) {
  const { prescriptions, loading, createPrescription, deletePrescription, isCreating } = usePrescriptions(consultationId);
  const [showForm, setShowForm] = useState(false);
  const [medicationName, setMedicationName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim()) return;
    try {
      await createPrescription({
        consultation_id: consultationId,
        medication_name: medicationName.trim(),
        dose: dose || undefined,
        frequency: frequency || undefined,
        duration_days: durationDays ? parseInt(durationDays) : undefined,
        notes: notes || undefined,
      });
      setMedicationName(""); setDose(""); setFrequency(""); setDurationDays(""); setNotes("");
      setShowForm(false);
    } catch {}
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Prescriptions</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />{showForm ? "Cancel" : "Add"}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 mb-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Medication *</Label>
                <Input value={medicationName} onChange={e => setMedicationName(e.target.value)} required />
              </div>
              <div>
                <Label>Dose</Label>
                <Input value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 500mg" />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. twice daily" />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isCreating}>Add Prescription</Button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prescriptions added.</p>
        ) : (
          <div className="space-y-2">
            {prescriptions.map(rx => (
              <div key={rx.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{rx.medication_name}</p>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    {rx.dose && <span>{rx.dose}</span>}
                    {rx.frequency && <span>{rx.frequency}</span>}
                    {rx.duration_days && <span>{rx.duration_days} days</span>}
                  </div>
                  {rx.notes && <p className="text-sm text-muted-foreground mt-1">{rx.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePrescription(rx.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
