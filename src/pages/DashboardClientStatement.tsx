import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { ClientStatementTab } from "@/components/clients";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";

export default function DashboardClientStatement() {
  const { clientId } = useParams<{ clientId: string }>();
  const { t } = useI18n();
  const { clients } = useClients();

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const clientName = client?.name || "";

  return (
    <DashboardShell>
      {/* Mobile Header */}
      <MobilePageHeader title={t("clients.statement.title")} showBack />

      {/* Inline client name context */}
      <div className="hidden lg:block px-6 py-3 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground">
          {t("clients.statement.title")}
        </h2>
        {clientName && (
          <p className="text-sm text-muted-foreground">{clientName}</p>
        )}
      </div>

      {/* Full-width statement content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        {clientId && (
          <ClientStatementTab clientId={clientId} clientName={clientName} />
        )}
      </div>
    </DashboardShell>
  );
}
