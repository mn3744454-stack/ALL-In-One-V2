import { useState } from "react";
import { ConnectionCard } from "./ConnectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConnectionWithDetails } from "@/hooks/connections/useConnectionsWithDetails";

interface ConnectionsListProps {
  connections: ConnectionWithDetails[];
  isLoading: boolean;
  onRevoke: (token: string) => void;
  onAccept: (token: string) => void;
  onReject: (token: string) => void;
  onSelect?: (connection: ConnectionWithDetails) => void;
  onCreateGrant?: (connection: ConnectionWithDetails) => void;
  selectedConnectionId?: string;
  onCreateClick: () => void;
}

export function ConnectionsList({
  connections,
  isLoading,
  onRevoke,
  onAccept,
  onReject,
  onSelect,
  onCreateGrant,
  selectedConnectionId,
  onCreateClick,
}: ConnectionsListProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredConnections = connections.filter((conn) => {
    // Search by partner name, email, phone
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      conn.connection_type.toLowerCase().includes(searchLower) ||
      conn.recipient_email?.toLowerCase().includes(searchLower) ||
      conn.recipient_phone?.includes(search) ||
      conn.initiator_tenant_name?.toLowerCase().includes(searchLower) ||
      conn.recipient_tenant_name?.toLowerCase().includes(searchLower) ||
      conn.recipient_profile_name?.toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === "all" || conn.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t("connections.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[120px] flex-shrink-0"
          >
            <option value="all">{t("common.all")}</option>
            <option value="pending">{t("connections.status.pending")}</option>
            <option value="accepted">{t("connections.status.accepted")}</option>
            <option value="rejected">{t("connections.status.rejected")}</option>
            <option value="revoked">{t("connections.status.revoked")}</option>
            <option value="expired">{t("connections.status.expired")}</option>
          </select>
          <Button onClick={onCreateClick} className="flex-shrink-0 whitespace-nowrap">
            <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2 sm:ltr:mr-2 sm:rtl:ml-2" />
            <span className="hidden sm:inline">{t("connections.create")}</span>
            <span className="sm:hidden">{t("common.add")}</span>
          </Button>
        </div>
      </div>

      {filteredConnections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t("connections.noConnections")}</p>
          <Button variant="link" onClick={onCreateClick}>
            {t("connections.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onRevoke={onRevoke}
              onAccept={onAccept}
              onReject={onReject}
              onSelect={onSelect}
              onCreateGrant={onCreateGrant}
              isSelected={selectedConnectionId === connection.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
