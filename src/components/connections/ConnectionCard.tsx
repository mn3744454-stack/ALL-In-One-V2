import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { QRCodeDialog } from "./QRCodeDialog";
import {
  Copy,
  Link2,
  MoreVertical,
  Trash2,
  Check,
  X,
  QrCode,
  LinkIcon,
  Building2,
  User,
  FileText,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import type { ConnectionWithDetails } from "@/hooks/connections/useConnectionsWithDetails";

interface ConnectionCardProps {
  connection: ConnectionWithDetails;
  onRevoke: (token: string) => void;
  onAccept?: (token: string) => void;
  onReject?: (token: string) => void;
  onSelect?: (connection: ConnectionWithDetails) => void;
  onCreateGrant?: (connection: ConnectionWithDetails) => void;
  isSelected?: boolean;
}

export function ConnectionCard({
  connection,
  onRevoke,
  onAccept,
  onReject,
  onSelect,
  onCreateGrant,
  isSelected,
}: ConnectionCardProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const isInitiator = connection.initiator_tenant_id === activeTenant?.tenant_id;
  const inviteUrl = `${window.location.origin}/connections/accept?token=${connection.token}`;
  const direction = isInitiator ? "outbound" : "inbound";

  // Determine partner identity based on direction
  const getPartnerInfo = () => {
    if (isInitiator) {
      // We initiated: partner is the recipient
      if (connection.recipient_tenant_id && connection.recipient_tenant_name) {
        return {
          name: connection.recipient_tenant_name,
          type: connection.recipient_tenant_type,
          isOrganization: true,
        };
      }
      if (connection.recipient_profile_name) {
        return {
          name: connection.recipient_profile_name,
          type: "profile",
          isOrganization: false,
        };
      }
      // Fallback to email/phone
      return {
        name: connection.recipient_email || connection.recipient_phone || t("common.unknown"),
        type: "contact",
        isOrganization: false,
      };
    } else {
      // We are recipient: partner is the initiator
      if (connection.initiator_tenant_name) {
        return {
          name: connection.initiator_tenant_name,
          type: connection.initiator_tenant_type,
          isOrganization: true,
        };
      }
      return {
        name: t("common.unknown"),
        type: "unknown",
        isOrganization: false,
      };
    }
  };

  const partner = getPartnerInfo();

  // Translate tenant type for display
  const getTenantTypeLabel = (type?: string) => {
    if (!type) return "";
    const typeKey = `onboarding.tenantTypes.${type}`;
    const translated = t(typeKey as keyof typeof t);
    // If translation returns the key itself, use capitalized type
    return translated === typeKey ? type.charAt(0).toUpperCase() + type.slice(1) : translated;
  };

  // Grants summary
  const grantsCount = connection.active_grants_count || 0;
  const grantTypes = connection.active_grant_types || [];
  
  const getGrantsLabel = () => {
    if (grantsCount === 0) {
      return t("connections.card.noGrants");
    }
    const typeLabels = grantTypes.map((type) => {
      const key = `connections.grants.resourceTypes.${type}` as keyof typeof t;
      const translated = t(key);
      return translated === key ? type : translated;
    });
    return `${grantsCount} ${grantsCount === 1 ? t("connections.card.grant") : t("connections.card.grants")}: ${typeLabels.join(", ")}`;
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(connection.token);
      setCopied(true);
      toast({
        title: t("common.success"),
        description: t("connections.tokenCopied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("common.error"),
        description: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: t("common.success"),
        description: t("connections.inviteLinkCopied"),
      });
    } catch {
      toast({
        title: t("common.error"),
        description: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const canRevoke = connection.status !== "revoked" && connection.status !== "expired" && connection.status !== "rejected";
  const isPendingInbound = connection.status === "pending" && !isInitiator;
  const isPendingOutbound = connection.status === "pending" && isInitiator;
  const isAccepted = connection.status === "accepted";

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
      }`}
      onClick={() => onSelect?.(connection)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {t(`connections.types.${connection.connection_type}` as keyof typeof t) || connection.connection_type}
            </Badge>
            <ConnectionStatusBadge status={connection.status} />
            <Badge variant={direction === "outbound" ? "default" : "secondary"}>
              {t(`connections.direction.${direction}` as keyof typeof t)}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isPendingOutbound && (
                <>
                  <DropdownMenuItem onClick={handleCopyInviteLink}>
                    <LinkIcon className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("connections.copyInviteLink")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyToken}>
                    <Copy className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("connections.copyToken")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowQr(true)}>
                    <QrCode className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("connections.showQr")}
                  </DropdownMenuItem>
                </>
              )}
              {canRevoke && !isPendingInbound && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevoke(connection.token);
                  }}
                >
                  <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("connections.revoke")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Partner identity - prominent display */}
          <div className="flex items-center gap-2">
            {partner.isOrganization ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{partner.name}</p>
              {partner.isOrganization && partner.type && (
                <p className="text-xs text-muted-foreground">
                  {getTenantTypeLabel(partner.type)}
                </p>
              )}
              {!partner.isOrganization && (
                <p className="text-xs text-muted-foreground">
                  {t("connections.card.personalProfile")}
                </p>
              )}
            </div>
          </div>

          {/* Grants summary */}
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className={grantsCount === 0 ? "text-muted-foreground" : "text-foreground"}>
              {getGrantsLabel()}
            </span>
          </div>

          {/* Create Grant CTA for accepted connections with no grants */}
          {isAccepted && grantsCount === 0 && isInitiator && onCreateGrant && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onCreateGrant(connection);
              }}
            >
              <Plus className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("connections.card.createGrant")}
            </Button>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(connection.created_at), {
              addSuffix: true,
            })}
          </div>
          
          {connection.expires_at && connection.status === "pending" && (
            <div className="text-xs text-warning">
              {t("connections.expiresIn")}{" "}
              {formatDistanceToNow(new Date(connection.expires_at))}
            </div>
          )}
          
          {/* Accept/Reject buttons for inbound pending connections */}
          {isPendingInbound && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept?.(connection.token);
                }}
              >
                <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("connections.accept")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(connection.token);
                }}
              >
                <X className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("connections.reject")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* QR Code Dialog */}
      <QRCodeDialog
        open={showQr}
        onOpenChange={setShowQr}
        url={inviteUrl}
      />
    </Card>
  );
}
