import { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BreedingContract, ContractStatus, useBreedingContracts } from "@/hooks/breeding/useBreedingContracts";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { displayHorseName, displayClientName, displayServiceName, formatBreedingDate } from "@/lib/displayHelpers";

interface Props {
  contract: BreedingContract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  completed: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-600 border-red-500/30",
  expired: "bg-amber-500/20 text-amber-600 border-amber-500/30",
};

export function BreedingContractDetailSheet({ contract, open, onOpenChange, canManage }: Props) {
  const { t, lang } = useI18n();
  const { updateContract } = useBreedingContracts();

  if (!contract) return null;

  const handleStatusChange = async (newStatus: ContractStatus) => {
    await updateContract(contract.id, { status: newStatus });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("breeding.contracts.detailTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold">{contract.contract_number}</span>
            <Badge variant="outline" className={cn("text-xs", statusColors[contract.status])}>
              {t(`breeding.contracts.statuses.${contract.status}`)}
            </Badge>
          </div>

          <DetailRow label={t("breeding.contracts.type")} value={t(`breeding.contracts.types.${contract.contract_type}`)} />

          <Separator />

          {/* Client */}
          {(contract.client?.name || contract.client_name) && (
            <DetailRow label={t("breeding.billing.client")} value={contract.client ? displayClientName(contract.client.name, contract.client.name_ar, lang) : contract.client_name || "—"} />
          )}
          {contract.external_party_name && (
            <DetailRow label={t("breeding.contracts.externalParty")} value={contract.external_party_name} />
          )}

          {/* Horses */}
          {contract.mare && (
            <DetailRow label={t("breeding.detail.mare")} value={displayHorseName(contract.mare.name, contract.mare.name_ar, lang)} />
          )}
          {contract.stallion && (
            <DetailRow label={t("breeding.detail.stallion")} value={displayHorseName(contract.stallion.name, contract.stallion.name_ar, lang)} />
          )}

          <Separator />

          {/* Service & Pricing */}
          {contract.service && (
            <DetailRow label={t("breeding.billing.service")} value={displayServiceName(contract.service.name, contract.service.name_ar, lang)} />
          )}
          <DetailRow label={t("breeding.contracts.pricingMode")} value={t(`breeding.contracts.pricingModes.${contract.pricing_mode}`)} />
          {contract.unit_price != null && (
            <DetailRow label={t("breeding.contracts.unitPrice")} value={`${contract.unit_price} ${contract.currency}`} />
          )}
          {contract.total_price != null && (
            <DetailRow label={t("breeding.contracts.totalPrice")} value={`${contract.total_price} ${contract.currency}`} />
          )}

          <Separator />

          {/* Dates */}
          {contract.start_date && (
            <DetailRow label={t("breeding.contracts.startDate")} value={formatBreedingDate(contract.start_date)} />
          )}
          {contract.end_date && (
            <DetailRow label={t("breeding.contracts.endDate")} value={formatBreedingDate(contract.end_date)} />
          )}

          {/* Notes */}
          {contract.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("common.notes")}</p>
                <p className="text-sm">{contract.notes}</p>
              </div>
            </>
          )}

          {/* Status change */}
          {canManage && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("breeding.contracts.changeStatus")}</p>
                <Select value={contract.status} onValueChange={(v) => handleStatusChange(v as ContractStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="draft">{t("breeding.contracts.statuses.draft")}</SelectItem>
                    <SelectItem value="active">{t("breeding.contracts.statuses.active")}</SelectItem>
                    <SelectItem value="completed">{t("breeding.contracts.statuses.completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("breeding.contracts.statuses.cancelled")}</SelectItem>
                    <SelectItem value="expired">{t("breeding.contracts.statuses.expired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end">{value || "—"}</span>
    </div>
  );
}
