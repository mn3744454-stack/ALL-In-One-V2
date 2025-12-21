import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2 } from "lucide-react";
import { PublicTenant, TENANT_TYPES, REGIONS } from "@/hooks/useDirectory";

interface TenantCardProps {
  tenant: PublicTenant;
}

export const TenantCard = ({ tenant }: TenantCardProps) => {
  const typeInfo = TENANT_TYPES.find((t) => t.value === tenant.type);
  const regionInfo = REGIONS.find((r) => r.value === tenant.region);

  if (!tenant.slug) return null;

  return (
    <Link to={`/t/${tenant.slug}`}>
      <Card
        variant="elevated"
        className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      >
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-to-br from-navy to-navy-light overflow-hidden">
          {tenant.cover_url ? (
            <img
              src={tenant.cover_url}
              alt=""
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 pattern-arabian opacity-20" />
          )}
          {/* Logo */}
          <div className="absolute -bottom-8 left-4">
            <div className="w-16 h-16 rounded-xl bg-card border-4 border-card shadow-md flex items-center justify-center overflow-hidden">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-gold" />
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-10 pb-4">
          {/* Type Badge */}
          <Badge variant="secondary" className="mb-2 text-xs">
            {typeInfo?.label || tenant.type}
          </Badge>

          {/* Name */}
          <h3 className="font-display text-lg font-semibold text-navy mb-1 group-hover:text-gold transition-colors line-clamp-1">
            {tenant.display_name}
          </h3>

          {/* Location */}
          {(tenant.public_location_text || regionInfo) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {tenant.public_location_text || regionInfo?.label}
              </span>
            </div>
          )}

          {/* Description */}
          {tenant.public_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tenant.public_description}
            </p>
          )}

          {/* Tags */}
          {tenant.tags && tenant.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {tenant.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {tenant.tags.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                  +{tenant.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
