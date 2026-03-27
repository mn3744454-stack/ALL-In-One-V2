import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package, Edit, Trash2 } from "lucide-react";
import { TenantService, CreateServiceInput } from "@/hooks/useServices";
import { ServiceCard } from "./ServiceCard";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BilingualName } from "@/components/ui/BilingualName";
import { useI18n } from "@/i18n";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ServicesListProps {
  services: TenantService[];
  isLoading?: boolean;
  planCountByServiceId?: Record<string, number>;
  onCreate: (data: CreateServiceInput) => Promise<void>;
  onUpdate: (data: CreateServiceInput & { id: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, is_active: boolean) => Promise<void>;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const SERVICE_KINDS = ['all', 'service', 'boarding', 'breeding', 'vet'] as const;

export const ServicesList = ({
  services,
  isLoading = false,
  planCountByServiceId = {},
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
}: ServicesListProps) => {
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('services-catalog');
  const { t } = useI18n();
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<TenantService | null>(null);

  const filteredServices = kindFilter === 'all'
    ? services
    : services.filter(s => s.service_kind === kindFilter);

  const translateKind = (kind: string) => {
    const key = `services.kinds.${kind === 'service' ? 'general' : kind}` as any;
    return t(key) || kind;
  };

  const translateType = (type: string | null) => {
    if (!type) return '—';
    const key = `services.types.${type}` as any;
    const translated = t(key);
    return translated && !translated.startsWith('services.types.') ? translated : type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">{t('services.emptyState.title')}</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {t('services.emptyState.desc')}
          </p>
          <ServiceFormDialog onSubmit={onCreate} isLoading={isCreating} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs + View switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={kindFilter} onValueChange={setKindFilter}>
          <TabsList className="h-auto flex-wrap">
            {SERVICE_KINDS.map(kind => (
              <TabsTrigger key={kind} value={kind} className="text-xs px-3 py-1.5">
                {kind === 'all' ? t('common.all') : translateKind(kind)}
                {kind !== 'all' && (
                  <Badge variant="secondary" className="ms-1.5 text-[10px] px-1.5 py-0">
                    {services.filter(s => s.service_kind === kind).length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="hidden md:flex">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable={true}
          />
        </div>
      </div>

      {viewMode === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('services.table.type')}</TableHead>
              <TableHead>{t('services.table.kind')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('services.table.unitPrice')}</TableHead>
              <TableHead>{t('services.table.plans')}</TableHead>
              <TableHead>{t('services.table.public')}</TableHead>
              <TableHead>{t('services.table.active')}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.map((service) => (
              <TableRow key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
                <TableCell>
                  <BilingualName name={service.name} nameAr={service.name_ar} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {translateType(service.service_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {translateKind(service.service_kind)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {service.unit_price != null ? service.unit_price : (service.price_display || '—')}
                </TableCell>
                <TableCell>{planCountByServiceId[service.id] || 0}</TableCell>
                <TableCell>
                  <Badge variant={service.is_public ? 'default' : 'secondary'} className="text-xs">
                    {service.is_public ? t('common.yes') : t('common.no')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={(checked) => onToggleActive(service.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ServiceFormDialog
                      service={service}
                      onSubmit={async (data) => onUpdate({ ...data, id: service.id })}
                      isLoading={isUpdating}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(service)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              linkedPlanCount={planCountByServiceId[service.id] || 0}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.confirm')} — "{deleteTarget?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
