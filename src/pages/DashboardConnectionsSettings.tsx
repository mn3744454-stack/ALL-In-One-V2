import { useState, useCallback } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobilePageHeader } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Link2, FileText, Activity, ArrowDownLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import {
  useConnections,
  useConnectionsWithDetails,
  useConsentGrants,
  useSharingAuditLog,
} from "@/hooks/connections";
import type { ConnectionWithDetails } from "@/hooks/connections";
import {
  ConnectionsList,
  AddPartnerDialog,
  ConsentGrantsList,
  CreateGrantDialog,
  SharingAuditLog,
  SharedWithMeTab,
} from "@/components/connections";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

const DashboardConnectionsSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeTenant } = useTenant();
  const { activeRole } = useTenant();
  const { t } = useI18n();
  const { toast } = useToast();

  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithDetails | null>(null);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [createGrantOpen, setCreateGrantOpen] = useState(false);

  const {
    connections: connectionsWithDetails,
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = useConnectionsWithDetails();

  const {
    connections: rawConnections,
    createConnection,
    acceptConnection,
    rejectConnection,
    revokeConnection,
  } = useConnections();

  const {
    grants,
    isLoading: grantsLoading,
    createGrant,
    revokeGrant,
  } = useConsentGrants(selectedConnection?.id);

  const { logs, isLoading: logsLoading, isFetching: logsFetching, hasMore, loadMore } = useSharingAuditLog(
    selectedConnection ? { connectionId: selectedConnection.id } : undefined
  );

  const canManage = activeRole === "owner" || activeRole === "manager";

  const handleAddPartner = async (recipientTenantId: string) => {
    await createConnection.mutateAsync({
      connectionType: "b2b",
      recipientTenantId,
    });
    setAddPartnerOpen(false);
  };

  const handleRevokeConnection = async (token: string) => {
    await revokeConnection.mutateAsync(token);
  };

  const handleAcceptConnection = useCallback(async (token: string) => {
    const result = await acceptConnection.mutateAsync(token);

    // After accepting, try to auto-apply preset based on tenant types
    setTimeout(async () => {
      const refetched = await refetchConnections();
      const acceptedConn = refetched.data?.find(
        (c) => c.token === token && c.status === "accepted"
      );

      if (acceptedConn?.recipient_tenant_id && acceptedConn?.initiator_tenant_id) {
        // Determine preset based on tenant types
        const types = [
          acceptedConn.initiator_tenant_type,
          acceptedConn.recipient_tenant_type,
        ].sort();
        let preset: string | null = null;
        if (types.includes("laboratory") && types.includes("stable")) {
          preset = "requests_and_results";
        } else if (types.includes("clinic") && types.includes("stable")) {
          preset = "appointments_and_records";
        } else if (types.includes("clinic") && types.includes("laboratory")) {
          preset = "referrals_and_results";
        }

        if (preset) {
          try {
            await supabase.rpc("apply_link_preset", {
              _connection_id: acceptedConn.id,
              _preset_name: preset,
            });
            toast({
              title: t("common.success"),
              description: t("connections.presetApplied"),
            });
          } catch {
            // Preset failed silently — user can still manually configure grants
          }
        }
      }
    }, 500);

    return result;
  }, [acceptConnection, refetchConnections, toast, t]);

  const handleRejectConnection = async (token: string) => {
    await rejectConnection.mutateAsync(token);
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

  const handleSelectConnection = (connection: ConnectionWithDetails) => {
    setSelectedConnection(connection);
  };

  const handleCreateGrantFromCard = (connection: ConnectionWithDetails) => {
    setSelectedConnection(connection);
    setCreateGrantOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <MobilePageHeader
          title={t("connections.title")}
          backTo="/dashboard/settings"
        />

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

        <main className="flex-1 p-4 lg:p-8">
          {!canManage && (
            <Alert className="mb-6 bg-warning/10 border-warning/30">
              <Shield className="w-4 h-4 text-warning" />
              <AlertDescription className="text-warning">
                {t("settings.permissionsRoles.unauthorized")}
              </AlertDescription>
            </Alert>
          )}

          <div className="max-w-6xl">
            <Tabs defaultValue="connections" className="space-y-6">
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 whitespace-nowrap">
                  <TabsTrigger value="connections" className="gap-2 flex-shrink-0">
                    <Link2 className="h-4 w-4" />
                    <span>{t("connections.tabs.connections")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="grants" className="gap-2 flex-shrink-0">
                    <FileText className="h-4 w-4" />
                    <span>{t("connections.tabs.grants")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="gap-2 flex-shrink-0">
                    <Activity className="h-4 w-4" />
                    <span>{t("connections.tabs.audit")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="sharedWithMe" className="gap-2 flex-shrink-0">
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>{t("connections.tabs.sharedWithMe")}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="connections" className="space-y-6">
                <ConnectionsList
                  connections={connectionsWithDetails}
                  isLoading={connectionsLoading}
                  onRevoke={handleRevokeConnection}
                  onAccept={handleAcceptConnection}
                  onReject={handleRejectConnection}
                  onSelect={handleSelectConnection}
                  onCreateGrant={handleCreateGrantFromCard}
                  selectedConnectionId={selectedConnection?.id}
                  onCreateClick={() => setAddPartnerOpen(true)}
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
                <SharingAuditLog
                  logs={logs}
                  isLoading={logsLoading}
                  isFetching={logsFetching}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                />
              </TabsContent>

              <TabsContent value="sharedWithMe" className="space-y-6">
                <SharedWithMeTab
                  connections={rawConnections}
                  isLoading={connectionsLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <AddPartnerDialog
        open={addPartnerOpen}
        onOpenChange={setAddPartnerOpen}
        onSubmit={handleAddPartner}
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
