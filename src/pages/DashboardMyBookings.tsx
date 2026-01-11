import { Link } from "react-router-dom";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyBookings, useCancelBooking } from "@/hooks/useAcademyBookings";
import { MyBookingCard } from "@/components/bookings/MyBookingCard";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardMyBookings = () => {
  const { data: bookings = [], isLoading } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const { t } = useI18n();

  const handleCancel = async (bookingId: string) => {
    await cancelBooking.mutateAsync(bookingId);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile Header */}
      <MobilePageHeader title={t("nav.myBookings")} backTo="/dashboard" />

      <div className="container mx-auto px-4 py-8">
        {/* Desktop Header */}
        <div className="mb-8 hidden lg:block">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.back")}
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-navy">
            {t("nav.myBookings")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("myBookings.subtitle")}
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
