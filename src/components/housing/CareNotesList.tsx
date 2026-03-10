import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useHorseCareNotes, type CareNoteType, type HorseCareNote } from "@/hooks/housing/useHorseCareNotes";
import { format } from "date-fns";
import { Plus, FileText, AlertTriangle, Utensils, Pill, MessageSquare } from "lucide-react";

interface CareNotesListProps {
  horseId: string;
  admissionId?: string;
}

const NOTE_TYPE_ICONS: Record<string, React.ElementType> = {
  feed_plan: Utensils,
  medication: Pill,
  care_note: MessageSquare,
  restriction: AlertTriangle,
  general: FileText,
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  feed_plan: 'Feed Plan',
  medication: 'Medication',
  care_note: 'Care Note',
  restriction: 'Restriction',
  training: 'Training',
  vet_note: 'Vet Note',
  general: 'General',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-destructive border-destructive/30',
  high: 'text-amber-600 border-amber-300',
  normal: '',
  low: 'text-muted-foreground',
};

export function CareNotesList({ horseId, admissionId }: CareNotesListProps) {
  const { notes, isLoading, createNote, isCreating, deleteNote } = useHorseCareNotes(horseId, admissionId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    note_type: 'general' as CareNoteType,
    title: '',
    body: '',
    priority: 'normal',
  });

  const handleCreate = async () => {
    if (!newNote.body.trim()) return;
    await createNote({
      horse_id: horseId,
      admission_id: admissionId || null,
      note_type: newNote.note_type,
      title: newNote.title || undefined,
      body: newNote.body,
      priority: newNote.priority,
    });
    setNewNote({ note_type: 'general', title: '', body: '', priority: 'normal' });
    setAddDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Care Notes
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No care notes yet</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note: HorseCareNote) => {
              const Icon = NOTE_TYPE_ICONS[note.note_type] || FileText;
              return (
                <div key={note.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs capitalize">
                      {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                    </Badge>
                    {note.priority !== 'normal' && (
                      <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_COLORS[note.priority] || ''}`}>
                        {note.priority}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ms-auto">
                      {format(new Date(note.created_at), 'MMM d')}
                    </span>
                  </div>
                  {note.title && <p className="font-medium text-sm">{note.title}</p>}
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{note.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Care Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newNote.note_type} onValueChange={v => setNewNote(n => ({ ...n, note_type: v as CareNoteType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feed_plan">Feed Plan</SelectItem>
                    <SelectItem value="care_note">Care Note</SelectItem>
                    <SelectItem value="restriction">Restriction</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newNote.priority} onValueChange={v => setNewNote(n => ({ ...n, priority: v }))}>
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
              <Label>Title (optional)</Label>
              <Input
                value={newNote.title}
                onChange={e => setNewNote(n => ({ ...n, title: e.target.value }))}
                placeholder="Brief title..."
              />
            </div>
            <div>
              <Label>Note *</Label>
              <Textarea
                value={newNote.body}
                onChange={e => setNewNote(n => ({ ...n, body: e.target.value }))}
                placeholder="Enter care note details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating || !newNote.body.trim()}>
              {isCreating ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
