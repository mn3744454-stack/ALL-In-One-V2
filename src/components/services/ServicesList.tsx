import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Package } from "lucide-react";
import { TenantService, CreateServiceInput } from "@/hooks/useServices";
import { ServiceCard } from "./ServiceCard";
import { ServiceFormDialog } from "./ServiceFormDialog";

interface ServicesListProps {
  services: TenantService[];
  isLoading?: boolean;
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
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
}: ServicesListProps) => {
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
          <h3 className="font-semibold text-navy mb-2">No Services Yet</h3>
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
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};
