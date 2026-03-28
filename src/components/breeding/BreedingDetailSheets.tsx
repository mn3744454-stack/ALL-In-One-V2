import { useState } from "react";
import { differenceInDays } from "date-fns";
import { Globe, Receipt, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { BreedingAttempt } from "@/hooks/breeding/useBreedingAttempts";
import { Pregnancy } from "@/hooks/breeding/usePregnancies";
import { BreedingStatusBadge } from "./BreedingStatusBadge";
import { PregnancyExamsPanel } from "./PregnancyExamsPanel";
import { CreateInvoiceFromBreedingEvent, type BreedingEventForInvoice } from "./CreateInvoiceFromBreedingEvent";
import { useI18n } from "@/i18n";
import { displayHorseName, formatBreedingDate } from "@/lib/displayHelpers";
import { useTenant } from "@/contexts/TenantContext";
import { recordAsStableCost } from "@/lib/finance/recordAsStableCost";
import { createSupplierPayableForExternal } from "@/lib/finance/createSupplierPayableForExternal";
import { toast } from "sonner";

// ── Breeding Record Detail Sheet ──

interface BreedingRecordDetailSheetProps {
  attempt: BreedingAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function BreedingRecordDetailSheet({ attempt, open, onOpenChange, canManage }: BreedingRecordDetailSheetProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [stableCostLoading, setStableCostLoading] = useState(false);

  if (!attempt) return null;

  const invoiceEvent: BreedingEventForInvoice = {
    sourceType: "breeding_attempt",
    sourceId: attempt.id,
    horseId: attempt.mare_id,
    mareName: attempt.mare?.name,
    mareNameAr: attempt.mare?.name_ar,
    stallionName: attempt.stallion?.name || attempt.external_stallion_name || undefined,
    stallionNameAr: attempt.stallion?.name_ar,
    eventDate: attempt.attempt_date,
    description: `${t("breeding.billing.sourceTypes.breeding_attempt")} — ${displayHorseName(attempt.mare?.name, attempt.mare?.name_ar, lang)}`,
    sourceMode: attempt.source_mode,
    externalProviderName: attempt.external_provider_name,
    // Contract-aware prefill
    contractId: attempt.contract?.id,
    contractNumber: attempt.contract?.contract_number,
    contractServiceId: attempt.contract?.service_id,
    contractUnitPrice: attempt.contract?.unit_price,
    contractClientId: attempt.contract?.client_id,
    contractClientName: attempt.contract?.client_name,
  };

  const handleRecordStableCost = async () => {
    if (!tenantId) return;
    setStableCostLoading(true);
    try {
      const ok = await recordAsStableCost({
        tenantId,
        entityType: "breeding_attempt",
        entityId: attempt.id,
        amount: 0,
        description: `${t("breeding.billing.sourceTypes.breeding_attempt")} — ${displayHorseName(attempt.mare?.name, attempt.mare?.name_ar, lang)}`,
        serviceMode: attempt.source_mode === "external" ? "external" : "internal",
        externalProviderId: null,
      });
      if (attempt.source_mode === "external" && attempt.external_provider_name) {
        await createSupplierPayableForExternal({
          tenantId,
          sourceType: "breeding_attempt",
          sourceReference: attempt.id,
          supplierName: attempt.external_provider_name,
          amount: 0,
          currency: "SAR",
        });
      }
      if (ok) {
        toast.success(t("vet.billing.stableCostRecorded"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setStableCostLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg">{t("breeding.detail.title")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <BreedingStatusBadge status={attempt.result} type="attempt" />
              {attempt.source_mode !== "internal" && (
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {t(`breeding.sourceMode.${attempt.source_mode}`)}
                </Badge>
              )}
            </div>

            <Separator />

            {/* Core info */}
            <DetailRow label={t("breeding.detail.mare")} value={displayHorseName(attempt.mare?.name, attempt.mare?.name_ar, lang)} />
            <DetailRow
              label={t("breeding.detail.stallion")}
              value={attempt.stallion ? displayHorseName(attempt.stallion.name, attempt.stallion.name_ar, lang) : attempt.external_stallion_name || "—"}
            />
            <DetailRow label={t("breeding.detail.method")} value={t(`breeding.methods.${attempt.attempt_type}`)} />
            <DetailRow label={t("breeding.detail.date")} value={formatBreedingDate(attempt.attempt_date)} />

            {attempt.source_mode === "external" && attempt.external_provider_name && (
              <DetailRow label={t("breeding.detail.providerName")} value={attempt.external_provider_name} />
            )}
            {attempt.performer && (
              <DetailRow label={t("breeding.detail.performedBy")} value={attempt.performer.full_name || "—"} />
            )}

            {/* Linked contract */}
            {attempt.contract && (
              <DetailRow label={t("breeding.contracts.contract")} value={attempt.contract.contract_number} />
            )}

            {attempt.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("breeding.detail.notes")}</p>
                  <p className="text-sm">{attempt.notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            {canManage && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setInvoiceDialogOpen(true)}
                  >
                    <Receipt className="h-4 w-4" />
                    {t("breeding.billing.generateInvoice")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleRecordStableCost}
                    disabled={stableCostLoading}
                  >
                    <Landmark className="h-4 w-4" />
                    {t("vet.billing.recordStableCost")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CreateInvoiceFromBreedingEvent
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        event={invoiceEvent}
      />
    </>
  );
}

// ── Pregnancy Detail Sheet ──

interface PregnancyDetailSheetProps {
  pregnancy: Pregnancy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function PregnancyDetailSheet({ pregnancy, open, onOpenChange, canManage }: PregnancyDetailSheetProps) {
  const { t, lang } = useI18n();
  if (!pregnancy) return null;

  const daysPregnant = (pregnancy.status === "pregnant" || pregnancy.status === "open")
    ? differenceInDays(new Date(), new Date(pregnancy.start_date))
    : null;

  const isActive = !pregnancy.ended_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{t("breeding.pregnancyDetail.title")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <BreedingStatusBadge status={pregnancy.status} type="pregnancy" />
            <BreedingStatusBadge status={pregnancy.verification_state} type="verification" />
          </div>

          <Separator />

          <DetailRow label={t("breeding.detail.mare")} value={displayHorseName(pregnancy.mare?.name, pregnancy.mare?.name_ar, lang)} />
          {pregnancy.stallion && (
            <DetailRow label={t("breeding.pregnancyDetail.stallion")} value={displayHorseName(pregnancy.stallion.name, pregnancy.stallion.name_ar, lang)} />
          )}
          <DetailRow label={t("breeding.pregnancyDetail.startDate")} value={formatBreedingDate(pregnancy.start_date)} />
          {pregnancy.expected_due_date && (
            <DetailRow label={t("breeding.pregnancyDetail.expectedDue")} value={formatBreedingDate(pregnancy.expected_due_date)} />
          )}
          {daysPregnant !== null && (
            <DetailRow label={t("breeding.pregnancyDetail.daysPregnant")} value={`${daysPregnant} ${t("breeding.days")}`} />
          )}

          {pregnancy.ended_at && (
            <>
              <Separator />
              <DetailRow label={t("breeding.pregnancyDetail.ended")} value={formatBreedingDate(pregnancy.ended_at)} />
              {pregnancy.end_reason && (
                <DetailRow label={t("breeding.pregnancyDetail.endReason")} value={t(`breeding.endReasons.${pregnancy.end_reason}`)} />
              )}
            </>
          )}

          {pregnancy.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("breeding.detail.notes")}</p>
                <p className="text-sm">{pregnancy.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Pregnancy Exams — read-only for closed pregnancies */}
          <PregnancyExamsPanel pregnancyId={pregnancy.id} canManage={canManage && isActive} mareId={pregnancy.mare_id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Shared detail row ──

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end">{value || "—"}</span>
    </div>
  );
}
