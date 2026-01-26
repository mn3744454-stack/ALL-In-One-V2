import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { Copy, Link2, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

interface ConnectionCardProps {
  connection: Connection;
  onRevoke: (token: string) => void;
  onSelect?: (connection: Connection) => void;
  isSelected?: boolean;
}

export function ConnectionCard({
  connection,
  onRevoke,
  onSelect,
  isSelected,
}: ConnectionCardProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const isInitiator = connection.initiator_tenant_id === activeTenant?.tenant_id;
  const direction = isInitiator ? "outbound" : "inbound";

  const getRecipientDisplay = () => {
    if (connection.recipient_email) return connection.recipient_email;
    if (connection.recipient_phone) return connection.recipient_phone;
    if (connection.recipient_tenant_id) return t("connections.tenant");
    if (connection.recipient_profile_id) return t("connections.profile");
    return t("common.unknown");
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

  const canRevoke = connection.status !== "revoked" && connection.status !== "expired" && connection.status !== "rejected";

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
              {connection.connection_type}
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
              {connection.status === "pending" && isInitiator && (
                <DropdownMenuItem onClick={handleCopyToken}>
                  <Copy className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("connections.copyToken")}
                </DropdownMenuItem>
              )}
              {canRevoke && (
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
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span>{getRecipientDisplay()}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(connection.created_at), {
              addSuffix: true,
            })}
          </div>
          {connection.expires_at && connection.status === "pending" && (
            <div className="text-xs text-orange-600">
              {t("connections.expiresIn")}{" "}
              {formatDistanceToNow(new Date(connection.expires_at))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
