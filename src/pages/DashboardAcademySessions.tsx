import { SessionsList } from "@/components/academy/SessionsList";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

const DashboardAcademySessions = () => {
  const { t } = useI18n();

  return (
    <DashboardShell>
      {/* Mobile Header */}
      <MobilePageHeader title={t("academy.sessions")} backTo="/dashboard" />

      <div className="container mx-auto px-4 py-8">
        <SessionsList />
      </div>
    </DashboardShell>
  );
};

export default DashboardAcademySessions;
