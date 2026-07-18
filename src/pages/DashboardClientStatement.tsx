import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { ClientStatementTab } from "@/components/clients";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardClientStatement() {
  const { clientId } = useParams<{ clientId: string }>();
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { clients } = useClients();
  const isRTL = dir === "rtl";

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const clientName = client?.name || "";

  // Slice 2C — Desktop Back to Customers. Prefers history back when the user
  // navigated in from the Customers list (preserves scroll/filters/pagination
  // via the router's own state), and falls back to a deep-link-safe route.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard/clients");
    }
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <DashboardShell>
      {/* Mobile Header — already renders a Back affordance */}
      <MobilePageHeader
        title={t("clients.statement.title")}
        showBack
        backTo="/dashboard/clients"
      />

      {/* Desktop Back + client context */}
      <div className="hidden lg:flex items-center gap-3 px-6 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          aria-label={t("clients.statement.backToClients")}
          className="gap-1"
        >
          <BackIcon className="h-4 w-4" />
          <span>{t("clients.statement.backToClients")}</span>
        </Button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {t("clients.statement.title")}
          </h2>
          {clientName && (
            <p className="text-sm text-muted-foreground truncate">{clientName}</p>
          )}
        </div>
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
