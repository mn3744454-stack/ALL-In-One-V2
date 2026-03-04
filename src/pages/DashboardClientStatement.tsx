import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { ClientStatementTab } from "@/components/clients";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ArrowLeft, ArrowRight, Menu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

export default function DashboardClientStatement() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { clients } = useClients();

  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const clientName = client?.name || "";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
      />

      <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("clients.statement.title")} showBack />

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center h-16 px-6 border-b bg-background/95 backdrop-blur gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
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
        </header>

        {/* Full-width statement content */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
          {clientId && (
            <ClientStatementTab clientId={clientId} clientName={clientName} />
          )}
        </div>
      </main>
    </div>
  );
}
