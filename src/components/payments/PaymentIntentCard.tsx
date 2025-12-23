import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { 
  type PaymentIntent, 
  getReferenceTypeLabel,
  getIntentTypeLabel 
} from "@/hooks/usePayments";
import { 
  GraduationCap, 
  Package, 
  ShoppingBag, 
  Gavel, 
  CreditCard,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface PaymentIntentCardProps {
  intent: PaymentIntent;
  showTenant?: boolean;
}

const referenceIcons: Record<PaymentIntent["reference_type"], typeof GraduationCap> = {
  academy_booking: GraduationCap,
  service: Package,
  order: ShoppingBag,
  auction: Gavel,
  subscription: CreditCard,
};

export function PaymentIntentCard({ intent, showTenant = false }: PaymentIntentCardProps) {
  const Icon = referenceIcons[intent.reference_type] || CreditCard;

  return (
    <Card variant="elevated" className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-gold" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-navy truncate">
                {getReferenceTypeLabel(intent.reference_type)}
              </h3>
              <PaymentStatusBadge status={intent.status} />
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {getIntentTypeLabel(intent.intent_type)}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(intent.created_at), "MMM d, yyyy")}
              </span>
              {intent.currency && (
                <span className="uppercase">{intent.currency}</span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-end shrink-0">
            {intent.amount_display ? (
              <span className="text-lg font-bold text-navy">
                {intent.amount_display}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Coming Soon Notice for Draft/Pending */}
        {(intent.status === "draft" || intent.status === "pending") && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Payment options coming soon. No action required at this time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
