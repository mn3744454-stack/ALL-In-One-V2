import { useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
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
  const { activeTenant, activeRole } = useTenant();
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

  const {
    logs,
    isLoading: logsLoading,
    isFetching: logsFetching,
    hasMore,
    loadMore,
  } = useSharingAuditLog();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const handleAddPartner = async (recipientTenantId: string) => {
    await createConnection.mutateAsync({
      connectionType: "b2b" as any,
      recipientTenantId: recipientTenantId,
    });
    setAddPartnerOpen(false);
  };

  const handleRevokeConnection = async (connectionId: string) => {
    await revokeConnection.mutateAsync(connectionId);
  };

  const handleAcceptConnection = useCallback(async (token: string) => {
    const result = await acceptConnection.mutateAsync(token);

    setTimeout(async () => {
      const refetched = await refetchConnections();
      const acceptedConn = refetched.data?.find(
        (c) => c.token === token && c.status === "accepted"
      );

      if (acceptedConn?.recipient_tenant_id && acceptedConn?.initiator_tenant_id) {
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
            // Preset failed silently
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
    <DashboardShell>
      <MobilePageHeader
        title={t("connections.title")}
        backTo="/dashboard/settings"
      />
      <PageToolbar title={t("connections.title")} />

      <div className="flex-1 p-4 lg:p-8">
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
    </DashboardShell>
  );
};

export default DashboardConnectionsSettings;
