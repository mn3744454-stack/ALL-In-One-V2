import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Banknote } from "lucide-react";
import type { AcademySession } from "@/hooks/useAcademySessions";

interface PublicSessionCardProps {
  session: AcademySession;
  confirmedCount: number;
  onBook: () => void;
  isAuthenticated: boolean;
}

export const PublicSessionCard = ({
  session,
  confirmedCount,
  onBook,
  isAuthenticated,
}: PublicSessionCardProps) => {
  const isFull = confirmedCount >= session.capacity;
  const availableSpots = session.capacity - confirmedCount;

  return (
    <Card variant="elevated" className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-navy text-lg truncate">
                {session.title}
              </h3>
              {session.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
            <Badge
              variant={isFull ? "destructive" : "secondary"}
              className="self-start shrink-0"
            >
              {isFull ? "Full" : `${availableSpots} spots left`}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-gold" />
              <span>{format(new Date(session.start_at), "EEE, MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-gold" />
              <span>
                {format(new Date(session.start_at), "h:mm a")} -{" "}
                {format(new Date(session.end_at), "h:mm a")}
              </span>
            </div>
            {session.location_text && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gold" />
                <span className="truncate">{session.location_text}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0 text-gold" />
              <span>
                {confirmedCount}/{session.capacity} booked
              </span>
            </div>
          </div>

          {/* Price & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border">
            {session.price_display && (
              <div className="flex items-center gap-2 text-navy font-semibold">
                <Banknote className="w-4 h-4 text-gold" />
                <span>{session.price_display}</span>
              </div>
            )}
            <Button
              variant="gold"
              className="w-full sm:w-auto"
              onClick={onBook}
              disabled={isFull}
            >
              {isFull
                ? "Fully Booked"
                : isAuthenticated
                ? "Book Now"
                : "Sign in to Book"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
