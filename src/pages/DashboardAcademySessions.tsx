import { SessionsList } from "@/components/academy/SessionsList";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useI18n } from "@/i18n";

const DashboardAcademySessions = () => {
  const { t } = useI18n();

  return (
    <DashboardShell>
      <MobilePageHeader title={t("academy.sessions")} backTo="/dashboard" />
      <PageToolbar title={t("academy.sessions")} />
      <div className="container mx-auto px-4 py-8">
        <SessionsList />
      </div>
    </DashboardShell>
  );
};

export default DashboardAcademySessions;
