import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { ClientStatementTab } from "@/components/clients";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function DashboardClientStatement() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";
  const { clients } = useClients();

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const clientName = client?.name || "";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <DashboardShell>
      <MobilePageHeader title={t("clients.statement.title")} showBack />

      <div className="p-4 lg:p-6">
        {/* Desktop back + title */}
        <div className="hidden lg:flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/clients")}
            className="gap-2"
          >
            <BackIcon className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("clients.statement.title")}
            </h1>
            {clientName && (
              <p className="text-sm text-muted-foreground">{clientName}</p>
            )}
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto">
          {clientId && (
            <ClientStatementTab clientId={clientId} clientName={clientName} />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
