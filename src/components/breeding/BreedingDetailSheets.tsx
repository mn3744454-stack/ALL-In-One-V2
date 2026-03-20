import { format, differenceInDays } from "date-fns";
import { Calendar, Clock, User, Globe, X } from "lucide-react";
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
import { useI18n } from "@/i18n";

// ── Breeding Record Detail Sheet ──

interface BreedingRecordDetailSheetProps {
  attempt: BreedingAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function BreedingRecordDetailSheet({ attempt, open, onOpenChange, canManage }: BreedingRecordDetailSheetProps) {
  const { t } = useI18n();
  if (!attempt) return null;

  return (
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
          <DetailRow label={t("breeding.detail.mare")} value={attempt.mare?.name} />
          <DetailRow
            label={t("breeding.detail.stallion")}
            value={attempt.stallion?.name || attempt.external_stallion_name || "—"}
          />
          <DetailRow label={t("breeding.detail.method")} value={t(`breeding.methods.${attempt.attempt_type}`)} />
          <DetailRow label={t("breeding.detail.date")} value={format(new Date(attempt.attempt_date), "PPP")} />

          {attempt.source_mode === "external" && attempt.external_provider_name && (
            <DetailRow label={t("breeding.detail.providerName")} value={attempt.external_provider_name} />
          )}
          {attempt.performer && (
            <DetailRow label={t("breeding.detail.performedBy")} value={attempt.performer.full_name || "—"} />
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
        </div>
      </SheetContent>
    </Sheet>
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
  const { t } = useI18n();
  if (!pregnancy) return null;

  const daysPregnant = (pregnancy.status === "pregnant" || pregnancy.status === "open")
    ? differenceInDays(new Date(), new Date(pregnancy.start_date))
    : null;

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

          <DetailRow label={t("breeding.detail.mare")} value={pregnancy.mare?.name} />
          {pregnancy.stallion && (
            <DetailRow label={t("breeding.pregnancyDetail.stallion")} value={pregnancy.stallion.name} />
          )}
          <DetailRow label={t("breeding.pregnancyDetail.startDate")} value={format(new Date(pregnancy.start_date), "PPP")} />
          {pregnancy.expected_due_date && (
            <DetailRow label={t("breeding.pregnancyDetail.expectedDue")} value={format(new Date(pregnancy.expected_due_date), "PPP")} />
          )}
          {daysPregnant !== null && (
            <DetailRow label={t("breeding.pregnancyDetail.daysPregnant")} value={`${daysPregnant} ${t("breeding.days")}`} />
          )}

          {pregnancy.ended_at && (
            <>
              <Separator />
              <DetailRow label={t("breeding.pregnancyDetail.ended")} value={format(new Date(pregnancy.ended_at), "PPP")} />
              {pregnancy.end_reason && (
                <DetailRow label={t("breeding.pregnancyDetail.endReason")} value={pregnancy.end_reason.replace(/_/g, " ")} />
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

          {/* Pregnancy Exams */}
          <PregnancyExamsPanel pregnancyId={pregnancy.id} canManage={canManage} />
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
