import { FileText, Calendar, User, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BreedingContract } from "@/hooks/breeding/useBreedingContracts";
import { useI18n } from "@/i18n";
import { displayHorseName, displayClientName, formatBreedingDate } from "@/lib/displayHelpers";
import { BilingualName } from "@/components/ui/BilingualName";

interface Props {
  contract: BreedingContract;
  onClick?: (contract: BreedingContract) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  completed: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-600 border-red-500/30",
  expired: "bg-amber-500/20 text-amber-600 border-amber-500/30",
};

export function BreedingContractCard({ contract, onClick }: Props) {
  const { t, lang } = useI18n();

  return (
    <Card
      className={cn("cursor-pointer hover:shadow-md transition-shadow")}
      onClick={() => onClick?.(contract)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{contract.contract_number}</span>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", statusColors[contract.status])}>
            {t(`breeding.contracts.statuses.${contract.status}`)}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          {t(`breeding.contracts.types.${contract.contract_type}`)}
        </div>

        {/* Client */}
        {(contract.client?.name || contract.client_name) && (
          <div className="flex items-center gap-1.5 text-xs">
            <User className="h-3 w-3 text-muted-foreground" />
            {contract.client
              ? <BilingualName name={contract.client.name} nameAr={contract.client.name_ar} inline primaryClassName="text-xs" secondaryClassName="text-[10px]" />
              : <span>{contract.client_name}</span>}
          </div>
        )}

        {/* Horses */}
        {contract.mare && (
          <div className="text-xs">
            <span className="text-muted-foreground">{t("breeding.detail.mare")}: </span>
            {displayHorseName(contract.mare.name, contract.mare.name_ar, lang)}
            {contract.stallion && (
              <span> × {displayHorseName(contract.stallion.name, contract.stallion.name_ar, lang)}</span>
            )}
          </div>
        )}

        {/* Pricing */}
        {contract.unit_price != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span>{contract.unit_price} {contract.currency}</span>
            <span className="text-muted-foreground">({t(`breeding.contracts.pricingModes.${contract.pricing_mode}`)})</span>
          </div>
        )}

        {/* Dates */}
        {contract.start_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {formatBreedingDate(contract.start_date)}
              {contract.end_date && ` → ${formatBreedingDate(contract.end_date)}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
