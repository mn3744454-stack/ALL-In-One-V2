import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";

interface ConnectionStatusBadgeProps {
  status: string;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { t } = useI18n();

  const getVariant = () => {
    switch (status) {
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "revoked":
        return "destructive";
      case "expired":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Badge variant={getVariant()}>
      {t(`connections.status.${status}` as keyof typeof t)}
    </Badge>
  );
}
