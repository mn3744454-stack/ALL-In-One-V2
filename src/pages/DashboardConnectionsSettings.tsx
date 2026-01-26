import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Link2, FileText, Activity } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import {
  useConnections,
  useConsentGrants,
  useSharingAuditLog,
} from "@/hooks/connections";
import {
  ConnectionsList,
  CreateConnectionDialog,
  ConsentGrantsList,
  CreateGrantDialog,
  SharingAuditLog,
} from "@/components/connections";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

const DashboardConnectionsSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeTenant, activeRole } = useTenant();
  const { t } = useI18n();

  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [createConnectionOpen, setCreateConnectionOpen] = useState(false);
  const [createGrantOpen, setCreateGrantOpen] = useState(false);

  const {
    connections,
    isLoading: connectionsLoading,
    createConnection,
    revokeConnection,
  } = useConnections();

  const {
    grants,
    isLoading: grantsLoading,
    createGrant,
    revokeGrant,
  } = useConsentGrants(selectedConnection?.id);

  const { logs, isLoading: logsLoading } = useSharingAuditLog(
    selectedConnection ? { connectionId: selectedConnection.id } : undefined
  );

  const canManage = activeRole === "owner" || activeRole === "manager";

  const handleCreateConnection = async (data: {
    connectionType: Database["public"]["Enums"]["connection_type"];
    recipientEmail?: string;
    recipientPhone?: string;
  }) => {
    await createConnection.mutateAsync({
      connectionType: data.connectionType,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
    });
    setCreateConnectionOpen(false);
  };

  const handleRevokeConnection = async (token: string) => {
    await revokeConnection.mutateAsync(token);
  };

  const handleCreateGrant = async (data: {
    connectionId: string;
    resourceType: string;
    accessLevel: string;
    dateFrom?: string;
    dateTo?: string;
    forwardOnly: boolean;
  }) => {
    await createGrant.mutateAsync({
      connectionId: data.connectionId,
      resourceType: data.resourceType,
      accessLevel: data.accessLevel,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      forwardOnly: data.forwardOnly,
    });
    setCreateGrantOpen(false);
  };

  const handleRevokeGrant = async (grantId: string) => {
    await revokeGrant.mutateAsync(grantId);
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobilePageHeader
          title={t("connections.title")}
          backTo="/dashboard/settings"
        />

        {/* Desktop Header */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-navy">
                  {t("connections.title")}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {activeTenant?.tenant.name}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          {!canManage && (
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <Shield className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {t("settings.permissionsRoles.unauthorized")}
              </AlertDescription>
            </Alert>
          )}

          <div className="max-w-6xl">
            <Tabs defaultValue="connections" className="space-y-6">
              <TabsList>
                <TabsTrigger value="connections" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  {t("connections.tabs.connections")}
                </TabsTrigger>
                <TabsTrigger value="grants" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("connections.tabs.grants")}
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-2">
                  <Activity className="h-4 w-4" />
                  {t("connections.tabs.audit")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connections" className="space-y-6">
                <ConnectionsList
                  connections={connections}
                  isLoading={connectionsLoading}
                  onRevoke={handleRevokeConnection}
                  onSelect={setSelectedConnection}
                  selectedConnectionId={selectedConnection?.id}
                  onCreateClick={() => setCreateConnectionOpen(true)}
                />
              </TabsContent>

              <TabsContent value="grants" className="space-y-6">
                <ConsentGrantsList
                  grants={grants}
                  isLoading={grantsLoading}
                  onRevoke={handleRevokeGrant}
                  onCreateClick={() => setCreateGrantOpen(true)}
                  connectionId={selectedConnection?.id}
                />
              </TabsContent>

              <TabsContent value="audit" className="space-y-6">
                <SharingAuditLog logs={logs} isLoading={logsLoading} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <CreateConnectionDialog
        open={createConnectionOpen}
        onOpenChange={setCreateConnectionOpen}
        onSubmit={handleCreateConnection}
        isLoading={createConnection.isPending}
      />

      {selectedConnection && (
        <CreateGrantDialog
          open={createGrantOpen}
          onOpenChange={setCreateGrantOpen}
          connectionId={selectedConnection.id}
          onSubmit={handleCreateGrant}
          isLoading={createGrant.isPending}
        />
      )}
    </div>
  );
};

export default DashboardConnectionsSettings;
