import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Check, X } from "lucide-react";
import { useFollowups } from "@/hooks/doctor/useFollowups";
import { format } from "date-fns";

interface FollowupListProps {
  consultationId: string;
}

export function FollowupList({ consultationId }: FollowupListProps) {
  const { followups, loading, createFollowup, markStatus, deleteFollowup, isCreating } = useFollowups(consultationId);
  const [showForm, setShowForm] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupDate) return;
    try {
      await createFollowup({
        consultation_id: consultationId,
        followup_date: new Date(followupDate).toISOString(),
        notes: notes || undefined,
      });
      setFollowupDate(""); setNotes("");
      setShowForm(false);
    } catch {}
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Follow-ups</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />{showForm ? "Cancel" : "Add"}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 mb-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label>Date *</Label>
              <Input type="datetime-local" value={followupDate} onChange={e => setFollowupDate(e.target.value)} required />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <Button type="submit" size="sm" disabled={isCreating}>Schedule Follow-up</Button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : followups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
        ) : (
          <div className="space-y-2">
            {followups.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{format(new Date(f.followup_date), "MMM d, yyyy HH:mm")}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[f.status] || statusColors.pending}`}>{f.status}</span>
                  </div>
                  {f.notes && <p className="text-sm text-muted-foreground mt-1">{f.notes}</p>}
                </div>
                <div className="flex gap-1">
                  {f.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => markStatus(f.id, "completed")} title="Mark completed">
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => markStatus(f.id, "cancelled")} title="Cancel">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => deleteFollowup(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
