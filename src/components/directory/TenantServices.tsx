import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Tag } from "lucide-react";
import { TenantService } from "@/hooks/useServices";

interface TenantServicesProps {
  services: TenantService[];
  isLoading?: boolean;
}

export const TenantServices = ({ services, isLoading = false }: TenantServicesProps) => {
  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Services</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-navy mb-2">No Services Listed</h3>
          <p className="text-sm text-muted-foreground">
            This business hasn't added any services yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg text-navy flex items-center gap-2">
          <Package className="w-5 h-5 text-gold" />
          Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-4 rounded-xl border border-border hover:border-gold/30 hover:bg-gold/5 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold text-navy">{service.name}</h4>
                {service.service_type && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Tag className="w-3 h-3 mr-1" />
                    {service.service_type}
                  </Badge>
                )}
              </div>
              
              {service.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {service.description}
                </p>
              )}
              
              {service.price_display && (
                <p className="text-sm font-medium text-gold">
                  {service.price_display}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
