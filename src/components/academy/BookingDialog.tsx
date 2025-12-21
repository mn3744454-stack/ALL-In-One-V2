import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, Clock, MapPin } from "lucide-react";
import { useCreateBooking } from "@/hooks/useAcademyBookings";
import type { AcademySession } from "@/hooks/useAcademySessions";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AcademySession;
  tenantId: string;
  tenantName: string;
}

export const BookingDialog = ({
  open,
  onOpenChange,
  session,
  tenantId,
  tenantName,
}: BookingDialogProps) => {
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const createBooking = useCreateBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createBooking.mutateAsync({
      session_id: session.id,
      tenant_id: tenantId,
      notes: notes.trim() || undefined,
    });

    setSubmitted(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation completes
    setTimeout(() => {
      setNotes("");
      setSubmitted(false);
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-navy mb-2">
              Booking Request Submitted!
            </h3>
            <p className="text-muted-foreground mb-6">
              Your booking request for "{session.title}" has been sent to {tenantName}. 
              They will review and confirm your booking soon.
            </p>
            <Button variant="gold" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">Book Session</DialogTitle>
          <DialogDescription>
            Request a booking for this training session
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Info */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-navy">{session.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold" />
                <span>{format(new Date(session.start_at), "EEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                <span>
                  {format(new Date(session.start_at), "h:mm a")} -{" "}
                  {format(new Date(session.end_at), "h:mm a")}
                </span>
              </div>
              {session.location_text && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  <span>{session.location_text}</span>
                </div>
              )}
            </div>
            {session.price_display && (
              <p className="text-navy font-semibold pt-2 border-t border-border">
                {session.price_display}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any special requests or information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={createBooking.isPending}
              className="w-full sm:w-auto"
            >
              {createBooking.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Booking Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
