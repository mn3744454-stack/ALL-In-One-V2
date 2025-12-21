import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicSessions, type AcademySession } from "@/hooks/useAcademySessions";
import { useSessionConfirmedCount } from "@/hooks/useAcademyBookings";
import { PublicSessionCard } from "./PublicSessionCard";
import { BookingDialog } from "./BookingDialog";
import { supabase } from "@/integrations/supabase/client";

interface PublicSessionsListProps {
  tenantId: string;
  tenantName: string;
}

// Component to fetch and display confirmed count for a session
const SessionCardWithCount = ({
  session,
  tenantId,
  tenantName,
  isAuthenticated,
  onBookClick,
}: {
  session: AcademySession;
  tenantId: string;
  tenantName: string;
  isAuthenticated: boolean;
  onBookClick: (session: AcademySession) => void;
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
    <PublicSessionCard
      session={session}
      confirmedCount={confirmedCount}
      onBook={() => onBookClick(session)}
      isAuthenticated={isAuthenticated}
    />
  );
};

export const PublicSessionsList = ({ tenantId, tenantName }: PublicSessionsListProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = usePublicSessions(tenantId);
  const [selectedSession, setSelectedSession] = useState<AcademySession | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const handleBookClick = (session: AcademySession) => {
    if (!user) {
      // Store intended destination and redirect to auth
      sessionStorage.setItem("redirectAfterAuth", window.location.pathname);
      navigate("/auth");
      return;
    }
    setSelectedSession(session);
    setBookingDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-navy mb-2">No Upcoming Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Check back later for new training sessions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => (
            <SessionCardWithCount
              key={session.id}
              session={session}
              tenantId={tenantId}
              tenantName={tenantName}
              isAuthenticated={!!user}
              onBookClick={handleBookClick}
            />
          ))}
        </CardContent>
      </Card>

      {selectedSession && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          session={selectedSession}
          tenantId={tenantId}
          tenantName={tenantName}
        />
      )}
    </>
  );
};
