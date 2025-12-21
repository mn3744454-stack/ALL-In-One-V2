import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Calendar } from "lucide-react";
import { useAcademySessions, useDeleteSession, useToggleSessionActive, type AcademySession } from "@/hooks/useAcademySessions";
import { supabase } from "@/integrations/supabase/client";
import { SessionCard } from "./SessionCard";
import { SessionFormDialog } from "./SessionFormDialog";

interface SessionsListProps {
  onEmpty?: () => React.ReactNode;
}

// Wrapper to fetch confirmed count for each session
const SessionCardWithCount = ({
  session,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  session: AcademySession;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) => {
  const [confirmedCount, setConfirmedCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("academy_bookings")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("status", "confirmed");
      
      setConfirmedCount(count || 0);
    };
    fetchCount();
  }, [session.id]);

  return (
    <SessionCard
      session={session}
      confirmedCount={confirmedCount}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleActive={onToggleActive}
    />
  );
};

export const SessionsList = ({ onEmpty }: SessionsListProps) => {
  const { data: sessions = [], isLoading } = useAcademySessions();
  const deleteSession = useDeleteSession();
  const toggleActive = useToggleSessionActive();
  
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademySession | undefined>();

  const handleEdit = (session: AcademySession) => {
    setEditingSession(session);
    setFormDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSession(undefined);
    setFormDialogOpen(true);
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession.mutateAsync(sessionId);
  };

  const handleToggleActive = async (session: AcademySession) => {
    await toggleActive.mutateAsync({ id: session.id, is_active: !session.is_active });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Manage your training sessions and classes
          </p>
        </div>
        <Button variant="gold" onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Session
        </Button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        onEmpty?.() || (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-navy mb-2">No Sessions Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first training session to start accepting bookings
            </p>
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <SessionCardWithCount
              key={session.id}
              session={session}
              onEdit={() => handleEdit(session)}
              onDelete={() => handleDelete(session.id)}
              onToggleActive={() => handleToggleActive(session)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <SessionFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        session={editingSession}
      />
    </div>
  );
};
