import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useHorseCareNotes, type CareNoteType, type HorseCareNote } from "@/hooks/housing/useHorseCareNotes";
import { useI18n } from "@/i18n";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Plus, FileText, AlertTriangle, Utensils, Pill, MessageSquare, Pencil, Trash2, Lock } from "lucide-react";

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

export function CareNotesList({ horseId, admissionId }: CareNotesListProps) {
  const { t } = useI18n();
  const { notes, isLoading, createNote, isCreating, updateNote, deleteNote, canEditNote } = useHorseCareNotes(horseId, admissionId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<HorseCareNote | null>(null);
  const [form, setForm] = useState({
    note_type: 'general' as CareNoteType,
    title: '',
    body: '',
    priority: 'normal',
  });

  const noteTypeLabel = (type: string) => t(`housing.careNotes.types.${type}`);
  const priorityLabel = (p: string) => t(`housing.careNotes.priorities.${p}`);

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'text-destructive border-destructive/30',
    high: 'text-amber-600 border-amber-300',
    normal: '',
    low: 'text-muted-foreground',
  };

  const openAdd = () => {
    setEditingNote(null);
    setForm({ note_type: 'general', title: '', body: '', priority: 'normal' });
    setDialogOpen(true);
  };

  const openEdit = (note: HorseCareNote) => {
    if (!canEditNote(note)) return;
    setEditingNote(note);
    setForm({
      note_type: note.note_type,
      title: note.title || '',
      body: note.body,
      priority: note.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.body.trim()) return;
    if (editingNote) {
      await updateNote({
        id: editingNote.id,
        note_type: form.note_type,
        title: form.title || undefined,
        body: form.body,
        priority: form.priority,
      });
    } else {
      await createNote({
        horse_id: horseId,
        admission_id: admissionId || null,
        note_type: form.note_type,
        title: form.title || undefined,
        body: form.body,
        priority: form.priority,
      });
    }
    setDialogOpen(false);
    setEditingNote(null);
  };

  const handleDelete = async (note: HorseCareNote) => {
    if (!canEditNote(note)) return;
    if (!confirm(t('housing.careNotes.confirmDelete') || 'Are you sure you want to delete this note?')) return;
    await deleteNote(note.id);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('housing.careNotes.title')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 me-1" />
          {t('common.add')}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">{t('housing.careNotes.empty')}</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note: HorseCareNote) => {
              const Icon = NOTE_TYPE_ICONS[note.note_type] || FileText;
              const editable = canEditNote(note);
              return (
                <div key={note.id} className="p-2 rounded-lg bg-muted/30 text-sm group">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs capitalize">
                      {noteTypeLabel(note.note_type)}
                    </Badge>
                    {note.priority !== 'normal' && (
                      <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_COLORS[note.priority] || ''}`}>
                        {priorityLabel(note.priority)}
                      </Badge>
                    )}
                    {!editable && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground ms-auto">
                      {formatStandardDate(note.created_at)}
                    </span>
                    {editable && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(note); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(note); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {note.title && <p className="font-medium text-sm">{note.title}</p>}
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{note.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t('housing.careNotes.editNote') : t('housing.careNotes.addNote')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('common.type')}</Label>
                <Select value={form.note_type} onValueChange={v => setForm(n => ({ ...n, note_type: v as CareNoteType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feed_plan">{t('housing.careNotes.types.feed_plan')}</SelectItem>
                    <SelectItem value="care_note">{t('housing.careNotes.types.care_note')}</SelectItem>
                    <SelectItem value="restriction">{t('housing.careNotes.types.restriction')}</SelectItem>
                    <SelectItem value="medication">{t('housing.careNotes.types.medication')}</SelectItem>
                    <SelectItem value="training">{t('housing.careNotes.types.training')}</SelectItem>
                    <SelectItem value="vet_note">{t('housing.careNotes.types.vet_note')}</SelectItem>
                    <SelectItem value="general">{t('housing.careNotes.types.general')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('housing.careNotes.priority')}</Label>
                <Select value={form.priority} onValueChange={v => setForm(n => ({ ...n, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('housing.careNotes.priorities.low')}</SelectItem>
                    <SelectItem value="normal">{t('housing.careNotes.priorities.normal')}</SelectItem>
                    <SelectItem value="high">{t('housing.careNotes.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('housing.careNotes.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('housing.careNotes.titleLabel')} ({t('common.optional')})</Label>
              <Input
                value={form.title}
                onChange={e => setForm(n => ({ ...n, title: e.target.value }))}
                placeholder={t('housing.careNotes.titlePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('housing.careNotes.bodyLabel')} *</Label>
              <Textarea
                value={form.body}
                onChange={e => setForm(n => ({ ...n, body: e.target.value }))}
                placeholder={t('housing.careNotes.bodyPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.body.trim()}>
              {isCreating ? t('common.loading') : editingNote ? t('common.save') : t('housing.careNotes.addNote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
