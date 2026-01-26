import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { GrantedDataPreviewDialog } from "./GrantedDataPreviewDialog";
import { formatDistanceToNow } from "date-fns";
import {
  Link2,
  FileText,
  Calendar,
  Shield,
  Eye,
  ArrowDownLeft,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConsentGrants } from "@/hooks/connections";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];
type ConsentGrant = Database["public"]["Tables"]["consent_grants"]["Row"];

interface SharedWithMeTabProps {
  connections: Connection[];
  isLoading: boolean;
}

export function SharedWithMeTab({
  connections,
  isLoading,
}: SharedWithMeTabProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const [selectedConnection, setSelectedConnection] =
    useState<Connection | null>(null);
  const [previewGrant, setPreviewGrant] = useState<ConsentGrant | null>(null);

  // Filter inbound connections: where we are the recipient (by tenant OR by profile)
  // These are ACCEPTED connections where data has been shared with us
  const inboundConnections = connections.filter(
    (c) =>
      c.status === "accepted" &&
      (c.recipient_tenant_id === activeTenant?.tenant_id ||
        c.recipient_profile_id === user?.id)
  );

  // Fetch grants for the selected connection
  const { grants, isLoading: grantsLoading } = useConsentGrants(
    selectedConnection?.id
  );

  // For recipient view, we need to see grants where this connection was used to share with us
  // The grants are created by the grantor (initiator) for us (recipient)
  const visibleGrants = grants;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left Column: Inbound Connections */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4" />
          {t("connections.sharedWithMe.title")}
        </h3>

        {inboundConnections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("connections.sharedWithMe.noInboundConnections")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboundConnections.map((connection) => (
              <Card
                key={connection.id}
                className={`cursor-pointer transition-all ${
                  selectedConnection?.id === connection.id
                    ? "ring-2 ring-primary"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedConnection(connection)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">
                      {connection.connection_type}
                    </Badge>
                    <ConnectionStatusBadge status={connection.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <span>
                        {connection.recipient_email ||
                          connection.recipient_phone ||
                          t("connections.tenant")}
                      </span>
                    </div>
                    <div className="text-xs">
                      {formatDistanceToNow(new Date(connection.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Grants for Selected Connection */}
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("connections.grants.title")}
        </h3>

        {!selectedConnection ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("connections.sharedWithMe.selectConnection")}</p>
          </div>
        ) : grantsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : visibleGrants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("connections.sharedWithMe.noGrants")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleGrants.map((grant) => (
              <Card key={grant.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">
                        {grant.resource_type}
                      </span>
                      <Badge
                        variant={
                          grant.status === "active" ? "default" : "secondary"
                        }
                      >
                        {t(
                          `connections.grants.status.${grant.status}` as keyof typeof t
                        )}
                      </Badge>
                    </div>
                    {grant.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewGrant(grant)}
                      >
                        <Eye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                        {t("connections.sharedWithMe.previewData")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{grant.access_level}</Badge>
                      {grant.forward_only && (
                        <Badge variant="outline">
                          {t("connections.grants.forwardOnly")}
                        </Badge>
                      )}
                    </div>
                    {(grant.date_from || grant.date_to) && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {grant.date_from || "∞"} → {grant.date_to || "∞"}
                        </span>
                      </div>
                    )}
                    {grant.resource_ids && grant.resource_ids.length > 0 && (
                      <div>
                        {grant.resource_ids.length}{" "}
                        {t("connections.sharedWithMe.horsesCount")}
                      </div>
                    )}
                    <div className="text-xs">
                      {formatDistanceToNow(new Date(grant.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      {previewGrant && (
        <GrantedDataPreviewDialog
          open={!!previewGrant}
          onOpenChange={(open) => !open && setPreviewGrant(null)}
          grantId={previewGrant.id}
          resourceType={previewGrant.resource_type}
          dateFrom={previewGrant.date_from || undefined}
          dateTo={previewGrant.date_to || undefined}
        />
      )}
    </div>
  );
}
