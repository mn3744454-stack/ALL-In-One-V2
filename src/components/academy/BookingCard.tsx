import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, MessageSquare } from "lucide-react";
import type { BookingWithUser } from "@/hooks/useAcademyBookings";

interface BookingCardProps {
  booking: BookingWithUser;
  onConfirm: () => void;
  onReject: () => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const BookingCard = ({
  booking,
  onConfirm,
  onReject,
  onCancel,
  isUpdating,
}: BookingCardProps) => {
  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";

  return (
    <Card variant="elevated">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy truncate">
                {booking.session.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <User className="w-4 h-4 text-gold" />
                <span className="truncate">
                  {booking.profile.full_name || booking.profile.email}
                </span>
              </div>
            </div>
            <Badge className={`${statusColors[booking.status]} shrink-0`}>
              {statusLabels[booking.status]}
            </Badge>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-gold" />
              <span>{format(new Date(booking.session.start_at), "EEE, MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-gold" />
              <span>
                {format(new Date(booking.session.start_at), "h:mm a")} -{" "}
                {format(new Date(booking.session.end_at), "h:mm a")}
              </span>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
              <MessageSquare className="w-4 h-4 shrink-0 text-gold mt-0.5" />
              <p className="text-muted-foreground">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          {(isPending || isConfirmed) && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              {isPending && (
                <>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={onConfirm}
                    disabled={isUpdating}
                    className="w-full sm:w-auto"
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReject}
                    disabled={isUpdating}
                    className="w-full sm:w-auto"
                  >
                    Reject
                  </Button>
                </>
              )}
              {isConfirmed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isUpdating}
                  className="w-full sm:w-auto text-destructive hover:text-destructive"
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          )}

          {/* Metadata */}
          <p className="text-xs text-muted-foreground">
            Requested {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
