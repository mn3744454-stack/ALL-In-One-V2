import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Pencil, Trash2, EyeOff, Tag, Layers } from "lucide-react";
import { TenantService, CreateServiceInput } from "@/hooks/useServices";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";

interface ServiceCardProps {
  service: TenantService;
  linkedPlanCount?: number;
  onUpdate: (data: CreateServiceInput & { id: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, is_active: boolean) => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export const ServiceCard = ({
  service,
  linkedPlanCount = 0,
  onUpdate,
  onDelete,
  onToggleActive,
  isUpdating = false,
  isDeleting = false,
}: ServiceCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { t, lang } = useI18n();

  const handleUpdate = async (data: CreateServiceInput) => {
    await onUpdate({ ...data, id: service.id });
  };

  return (
    <>
      <Card
        variant="elevated"
        className={`transition-all ${!service.is_active ? "opacity-60" : ""}`}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-2">
                <BilingualName name={service.name} nameAr={service.name_ar} primaryClassName="font-semibold text-navy text-base sm:text-lg" className="flex-1 min-w-0" />
                <div className="flex items-center gap-1.5 shrink-0">
                  {service.service_kind && service.service_kind !== "service" && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {t(`services.kinds.${service.service_kind}` as any) || service.service_kind}
                    </Badge>
                  )}
                  {!service.is_public && (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="w-3 h-3 mr-1" />
                      {t("services.private")}
                    </Badge>
                  )}
                  {!service.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      {t("common.inactive")}
                    </Badge>
                  )}
                </div>
              </div>

              {service.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {service.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {service.service_type && (
                  <Badge variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {service.service_type}
                  </Badge>
                )}
                {service.unit_price != null && (
                  <span className="text-sm font-medium text-gold">
                    {service.unit_price} SAR
                  </span>
                )}
                {service.price_display && !service.unit_price && (
                  <span className="text-sm font-medium text-gold">
                    {service.price_display}
                  </span>
                )}
                {linkedPlanCount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Layers className="w-3 h-3" />
                    {linkedPlanCount} {t('services.table.plans')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {service.is_active ? t("common.active") : t("common.inactive")}
                </span>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={(checked) => onToggleActive(service.id, checked)}
                  disabled={isUpdating}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                    <span className="sr-only">{t("common.actions")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ServiceFormDialog
                    service={service}
                    onSubmit={handleUpdate}
                    isLoading={isUpdating}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="w-4 h-4 mr-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirm")} — "{service.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(service.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
