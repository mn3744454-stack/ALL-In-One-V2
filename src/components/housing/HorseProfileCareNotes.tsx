import { useI18n } from "@/i18n";
import { useHorseCareNotes, type HorseCareNote, type CareNoteType } from "@/hooks/housing/useHorseCareNotes";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Utensils, Pill, AlertTriangle, MessageSquare, GraduationCap, Stethoscope, Lock } from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { useState } from "react";
import { CareNotesList } from "./CareNotesList";

const NOTE_TYPE_ICONS: Record<string, React.ElementType> = {
  feed_plan: Utensils,
  medication: Pill,
  care_note: MessageSquare,
  restriction: AlertTriangle,
  training: GraduationCap,
  vet_note: Stethoscope,
  general: FileText,
};

interface HorseProfileCareNotesProps {
  horseId: string;
  admissionId?: string;
}

/**
 * Enhanced care notes for Horse Profile (Phase 6).
 * Shows all note types with filtering and authorship display.
 * Respects authorship boundaries: stable users cannot edit externally-authored notes.
 */
export function HorseProfileCareNotes({ horseId, admissionId }: HorseProfileCareNotesProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { notes: allNotes, isLoading, canEditNote } = useHorseCareNotes(horseId);

  if (isLoading) return null;
  if (allNotes.length === 0 && !admissionId) return null;

  // If admissionId provided, show admission-linked CareNotesList which handles CRUD
  if (admissionId) {
    return <CareNotesList horseId={horseId} admissionId={admissionId} />;
  }

  // Group by type for summary
  const typeGroups: Record<string, HorseCareNote[]> = {};
  for (const note of allNotes) {
    const type = note.note_type;
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(note);
  }

  const filteredNotes = typeFilter === 'all' ? allNotes : allNotes.filter(n => n.note_type === typeFilter);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t('housing.careNotes.title')}
          <Badge variant="secondary" className="text-xs">{allNotes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setTypeFilter('all')}
          >
            {t('common.all')} ({allNotes.length})
          </Button>
          {Object.entries(typeGroups).map(([type, notes]) => {
            const Icon = NOTE_TYPE_ICONS[type] || FileText;
            return (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setTypeFilter(type)}
              >
                <Icon className="h-3 w-3" />
                {t(`housing.careNotes.types.${type}`)} ({notes.length})
              </Button>
            );
          })}
        </div>

        {/* Notes list */}
        <div className="space-y-2">
          {filteredNotes.slice(0, 10).map(note => {
            const Icon = NOTE_TYPE_ICONS[note.note_type] || FileText;
            const editable = canEditNote(note);

            return (
              <div key={note.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs capitalize">
                    {t(`housing.careNotes.types.${note.note_type}`)}
                  </Badge>
                  {note.priority !== 'normal' && (
                    <Badge variant="outline" className={`text-xs capitalize ${note.priority === 'urgent' ? 'text-destructive border-destructive/30' : note.priority === 'high' ? 'text-amber-600 border-amber-300' : 'text-muted-foreground'}`}>
                      {t(`housing.careNotes.priorities.${note.priority}`)}
                    </Badge>
                  )}
                  {!editable && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      {t('housing.careNotes.external')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ms-auto">
                    {formatStandardDate(note.created_at)}
                  </span>
                </div>
                {note.title && <p className="font-medium text-sm">{note.title}</p>}
                <p className="text-muted-foreground text-xs whitespace-pre-wrap line-clamp-2">{note.body}</p>
                {note.created_by_profile?.full_name && (
                  <p className="text-xs text-muted-foreground mt-1">{t('housing.admissions.detail.by')} {note.created_by_profile.full_name}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
