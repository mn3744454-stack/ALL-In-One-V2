import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { PublicTenantDetail } from "@/hooks/usePublicTenant";

interface TenantContactInfoProps {
  tenant: PublicTenantDetail;
}

export const TenantContactInfo = ({ tenant }: TenantContactInfoProps) => {
  const hasContactInfo =
    tenant.public_phone || tenant.public_email || tenant.public_website;

  if (!hasContactInfo) return null;

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg text-navy">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenant.public_phone && (
          <a
            href={`tel:${tenant.public_phone}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Phone className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">{tenant.public_phone}</p>
            </div>
          </a>
        )}

        {tenant.public_email && (
          <a
            href={`mailto:${tenant.public_email}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Mail className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{tenant.public_email}</p>
            </div>
          </a>
        )}

        {tenant.public_website && (
          <a
            href={
              tenant.public_website.startsWith("http")
                ? tenant.public_website
                : `https://${tenant.public_website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
              <Globe className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Website</p>
              <p className="font-medium text-foreground truncate">
                {tenant.public_website}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        )}

        <Button variant="gold" className="w-full mt-4">
          Contact Business
        </Button>
      </CardContent>
    </Card>
  );
};
