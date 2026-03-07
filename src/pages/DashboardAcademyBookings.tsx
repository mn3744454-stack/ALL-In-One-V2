import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BookingsList } from "@/components/academy/BookingsList";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardAcademyBookings = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile Header */}
      <MobilePageHeader title={t("academy.bookings")} backTo="/dashboard" />

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
        </div>

        {/* Bookings List */}
        <BookingsList />
      </div>
    </div>
  );
};

export default DashboardAcademyBookings;
