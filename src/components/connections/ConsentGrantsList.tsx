import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, Calendar, Shield } from "lucide-react";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type ConsentGrant = Database["public"]["Tables"]["consent_grants"]["Row"];

interface ConsentGrantsListProps {
  grants: ConsentGrant[];
  isLoading: boolean;
  onRevoke: (grantId: string) => void;
  onCreateClick: () => void;
  connectionId?: string;
}

export function ConsentGrantsList({
  grants,
  isLoading,
  onRevoke,
  onCreateClick,
  connectionId,
}: ConsentGrantsListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!connectionId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("connections.grants.selectConnection")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{t("connections.grants.title")}</h3>
        <Button onClick={onCreateClick} size="sm">
          <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("connections.grants.create")}
        </Button>
      </div>

      {grants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("connections.grants.noGrants")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grants.map((grant) => (
            <Card key={grant.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {grant.resource_type}
                    </span>
                    <Badge
                      variant={grant.status === "active" ? "default" : "secondary"}
                    >
                      {t(`connections.grants.status.${grant.status}` as keyof typeof t)}
                    </Badge>
                  </div>
                  {grant.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRevoke(grant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
                      {grant.resource_ids.length} {t("connections.grants.horsesShared")}
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
  );
}
