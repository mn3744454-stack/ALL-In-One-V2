import { BookingsList } from "@/components/academy/BookingsList";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useI18n } from "@/i18n";

const DashboardAcademyBookings = () => {
  const { t } = useI18n();

  return (
    <DashboardShell>
      <MobilePageHeader title={t("academy.bookings")} backTo="/dashboard" />
      <div className="container mx-auto px-4 py-8">
        <BookingsList />
      </div>
    </DashboardShell>
  );
};

export default DashboardAcademyBookings;
