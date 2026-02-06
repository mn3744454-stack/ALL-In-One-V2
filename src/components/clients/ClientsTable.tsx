import { useI18n } from "@/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Client, ClientStatus, ClientType } from "@/hooks/useClients";

interface ClientsTableProps {
  clients: Client[];
  canManage?: boolean;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  onViewStatement?: (client: Client) => void;
}

const STATUS_VARIANTS: Record<ClientStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning border-warning/20",
};

const TYPE_LABELS: Record<ClientType, string> = {
  individual: "clients.types.individual",
  organization: "clients.types.organization",
  farm: "clients.types.farm",
  clinic: "clients.types.clinic",
};

export function ClientsTable({
  clients,
  canManage = false,
  onEdit,
  onDelete,
  onViewStatement,
}: ClientsTableProps) {
  const { t, dir, lang } = useI18n();

  const getClientDisplayName = (client: Client) => {
    if (dir === "rtl" && client.name_ar) {
      return client.name_ar;
    }
    return client.name;
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">{t("clients.form.name")}</TableHead>
            <TableHead className="text-center">{t("clients.form.phone")}</TableHead>
            <TableHead className="text-center">{t("clients.form.email")}</TableHead>
            <TableHead className="text-center">{t("clients.form.type")}</TableHead>
            <TableHead className="text-center">{t("clients.balance")}</TableHead>
            <TableHead className="text-center">{t("common.status")}</TableHead>
            <TableHead className="text-center">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const hasBalance = (client.outstanding_balance || 0) > 0;
            
            return (
              <TableRow key={client.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {getClientDisplayName(client)}
                </TableCell>
                <TableCell className="text-center font-mono text-sm" dir="ltr">
                  {client.phone || "-"}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {client.email || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {t(TYPE_LABELS[client.type])}
                  </Badge>
                </TableCell>
                <TableCell className={cn(
                  "text-center font-mono tabular-nums",
                  hasBalance && "text-destructive"
                )} dir="ltr">
                  {formatCurrency(client.outstanding_balance || 0, "SAR")}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", STATUS_VARIANTS[client.status])}
                  >
                    {t(`clients.status.${client.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewStatement?.(client)}>
                        <FileText className="h-4 w-4 me-2" />
                        {t("clients.statement.title")}
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit?.(client)}>
                            <Edit className="h-4 w-4 me-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete?.(client)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
