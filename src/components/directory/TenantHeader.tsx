import { Badge } from "@/components/ui/badge";
import { MapPin, Building2 } from "lucide-react";
import { PublicTenantDetail } from "@/hooks/usePublicTenant";
import { TENANT_TYPES, REGIONS } from "@/hooks/useDirectory";

interface TenantHeaderProps {
  tenant: PublicTenantDetail;
}

export const TenantHeader = ({ tenant }: TenantHeaderProps) => {
  const typeInfo = TENANT_TYPES.find((t) => t.value === tenant.type);
  const regionInfo = REGIONS.find((r) => r.value === tenant.region);

  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-navy to-navy-light overflow-hidden">
        {tenant.cover_url ? (
          <img
            src={tenant.cover_url}
            alt=""
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 pattern-arabian opacity-20" />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/30 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-gold" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-1">
              <Badge
                variant="secondary"
                className="mb-2 bg-gold/20 text-gold-light border-gold/30"
              >
                {typeInfo?.label || tenant.type}
              </Badge>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-cream mb-2 line-clamp-2">
                {tenant.display_name}
              </h1>
              {(tenant.public_location_text || regionInfo) && (
                <div className="flex items-center gap-2 text-cream/80">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {tenant.public_location_text || regionInfo?.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
