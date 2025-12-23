import { Badge } from "@/components/ui/badge";
import { getStatusInfo, type PaymentIntent } from "@/hooks/usePayments";

interface PaymentStatusBadgeProps {
  status: PaymentIntent["status"];
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const { label, color } = getStatusInfo(status);

  return (
    <Badge variant="outline" className={`${color} border-0 ${className}`}>
      {label}
    </Badge>
  );
}
