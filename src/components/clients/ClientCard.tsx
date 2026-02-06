import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { MoreVertical, Phone, Mail, MapPin, AlertCircle, Pencil, Trash2, FileText } from "lucide-react";
import { ClientStatusBadge } from "./ClientStatusBadge";
import { ClientTypeBadge, getClientTypeIcon } from "./ClientTypeBadge";
import { formatCurrency } from "@/lib/formatters";
import type { Client } from "@/hooks/useClients";

interface ClientCardProps {
  client: Client;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  onViewStatement?: (client: Client) => void;
  canManage?: boolean;
}

export function ClientCard({ client, onEdit, onDelete, onViewStatement, canManage = false }: ClientCardProps) {
  const { t, lang } = useI18n();
  const Icon = getClientTypeIcon(client.type);

  // Use localized name: Arabic UI shows Arabic name if available
  const displayName = lang === 'ar' && client.name_ar ? client.name_ar : client.name;
  const secondaryName = lang === 'ar' && client.name_ar && client.name !== client.name_ar ? client.name : client.name_ar;

  const hasOutstandingBalance = (client.outstanding_balance || 0) > 0;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
              {secondaryName && secondaryName !== displayName && (
                <p className="text-sm text-muted-foreground truncate" dir={lang === 'ar' ? 'ltr' : 'rtl'}>
                  {secondaryName}
                </p>
              )}
            </div>
          </div>
          
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewStatement?.(client)}>
                  <FileText className="h-4 w-4 me-2" />
                  {t("clients.statement.view")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit?.(client)}>
                  <Pencil className="h-4 w-4 me-2" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete?.(client)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <ClientTypeBadge type={client.type} showIcon={false} />
          <ClientStatusBadge status={client.status} />
        </div>

        <div className="space-y-1.5 text-sm">
          {client.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate" dir="ltr">{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.address}</span>
            </div>
          )}
        </div>

        {hasOutstandingBalance && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-700 font-medium font-mono tabular-nums" dir="ltr">
              {t("clients.outstandingBalance")}: {formatCurrency(client.outstanding_balance || 0, "SAR")}
            </span>
          </div>
        )}

        {client.credit_limit && (
          <div className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">
            {t("clients.form.creditLimit")}: {formatCurrency(client.credit_limit, "SAR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
