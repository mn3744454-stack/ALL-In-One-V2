import { Link } from "react-router-dom";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyBookings, useCancelBooking } from "@/hooks/useAcademyBookings";
import { MyBookingCard } from "@/components/bookings/MyBookingCard";

const DashboardMyBookings = () => {
  const { data: bookings = [], isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();

  const handleCancel = async (bookingId: string) => {
    await cancelBooking.mutateAsync(bookingId);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-navy">
            My Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your session bookings
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-xl bg-card">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-navy mb-2">No Bookings Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse academies in our directory to book training sessions
            </p>
            <Button variant="gold" asChild>
              <Link to="/directory">Browse Directory</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((booking) => (
              <MyBookingCard
                key={booking.id}
                booking={booking}
                onCancel={() => handleCancel(booking.id)}
                isCancelling={cancelBooking.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardMyBookings;
