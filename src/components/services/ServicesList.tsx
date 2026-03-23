import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";
import { TenantService, CreateServiceInput } from "@/hooks/useServices";
import { ServiceCard } from "./ServiceCard";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";

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
          <h3 className="font-semibold text-foreground mb-2">No Services Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first service to showcase what your business offers
          </p>
          <ServiceFormDialog onSubmit={onCreate} isLoading={isCreating} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:flex justify-end">
        <ViewSwitcher
          viewMode={viewMode}
          gridColumns={gridColumns}
          onViewModeChange={setViewMode}
          onGridColumnsChange={setGridColumns}
          showTable={true}
        />
      </div>
      {viewMode === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="whitespace-nowrap">Unit Price</TableHead>
              <TableHead>Plans</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">
                  <div>
                    {service.name}
                    {service.name_ar && <span className="text-muted-foreground text-xs ms-1">({service.name_ar})</span>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{service.service_type || '—'}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm capitalize">{service.service_kind}</TableCell>
                <TableCell className="whitespace-nowrap">{service.unit_price != null ? service.unit_price : (service.price_display || '—')}</TableCell>
                <TableCell>{planCountByServiceId[service.id] || 0}</TableCell>
                <TableCell><Badge variant={service.is_public ? 'default' : 'secondary'} className="text-xs">{service.is_public ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell><Switch checked={service.is_active} onCheckedChange={(checked) => onToggleActive(service.id, checked)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {services.map((service) => (
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
    </div>
  );
};
