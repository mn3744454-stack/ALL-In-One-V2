import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, Building2, Banknote, X } from "lucide-react";
import type { BookingWithSession } from "@/hooks/useAcademyBookings";

interface MyBookingCardProps {
  booking: BookingWithSession;
  onCancel: () => void;
  isCancelling?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Confirmation",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const MyBookingCard = ({
  booking,
  onCancel,
  isCancelling,
}: MyBookingCardProps) => {
  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const isPast = new Date(booking.session.end_at) < new Date();

  return (
    <Card variant="elevated" className={isPast ? "opacity-60" : ""}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-navy text-lg truncate">
                {booking.session.title}
              </h3>
              <Link
                to={`/t/${booking.tenant.slug}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mt-1"
              >
                <Building2 className="w-4 h-4" />
                <span className="truncate">{booking.tenant.name}</span>
              </Link>
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
            {booking.session.location_text && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-gold" />
                <span className="truncate">{booking.session.location_text}</span>
              </div>
            )}
            {booking.session.price_display && (
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 shrink-0 text-gold" />
                <span>{booking.session.price_display}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="text-sm bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">{booking.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Booked {format(new Date(booking.created_at), "MMM d, yyyy")}
            </p>
            
            {canCancel && !isPast && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCancelling}
                    className="w-full sm:w-auto text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your booking for "{booking.session.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
