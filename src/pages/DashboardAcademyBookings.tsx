import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BookingsList } from "@/components/academy/BookingsList";

const DashboardAcademyBookings = () => {
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
        </div>

        {/* Bookings List */}
        <BookingsList />
      </div>
    </div>
  );
};

export default DashboardAcademyBookings;
