import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { ClientCard } from "./ClientCard";
import type { Client } from "@/hooks/useClients";

interface ClientsListProps {
  clients: Client[];
  loading?: boolean;
  canManage?: boolean;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  onViewStatement?: (client: Client) => void;
}

export function ClientsList({
  clients,
  loading = false,
  canManage = false,
  onEdit,
  onDelete,
  onViewStatement,
}: ClientsListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          {t("clients.empty")}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("clients.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewStatement={onViewStatement}
        />
      ))}
    </div>
  );
}
