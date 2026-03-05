import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { EnrichedDescription } from "@/lib/finance/enrichLedgerDescriptions";

interface LedgerRowPreviewProps {
  enrichment?: EnrichedDescription;
  fallbackText: string;
  dir?: string;
}

export function LedgerRowPreview({ enrichment, fallbackText, dir }: LedgerRowPreviewProps) {
  const { t } = useI18n();

  const hasDetails = enrichment && (
    enrichment.invoiceNumber ||
    enrichment.horseName ||
    enrichment.horseNameAr ||
    enrichment.sampleLabel ||
    (enrichment.items && enrichment.items.length > 0) ||
    enrichment.paymentMethod
  );

  if (!hasDetails) {
    return <span>{fallbackText}</span>;
  }

  const displayHorseName = dir === "rtl"
    ? (enrichment.horseNameAr || enrichment.horseName)
    : (enrichment.horseName || enrichment.horseNameAr);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/40 hover:border-foreground transition-colors">
          {fallbackText}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 text-sm"
        align={dir === "rtl" ? "end" : "start"}
        side="bottom"
      >
        <div className="space-y-2">
          {enrichment.invoiceNumber && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t("finance.invoices.number")}</span>
              <span className="font-mono font-medium text-xs">{enrichment.invoiceNumber}</span>
            </div>
          )}
          {displayHorseName && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t("horses.horse")}</span>
              <span className="font-medium text-sm">{displayHorseName}</span>
            </div>
          )}
          {enrichment.sampleLabel && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t("lab.samples.sample")}</span>
              <span className="font-mono text-xs">{enrichment.sampleLabel}</span>
            </div>
          )}
          {enrichment.items && enrichment.items.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">{t("finance.invoices.lineItems")}</span>
              <div className="mt-1 ms-1 space-y-0.5">
                {enrichment.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="text-xs text-foreground">• {item}</div>
                ))}
                {enrichment.items.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{enrichment.items.length - 3} {t("common.more") || "more"}
                  </div>
                )}
              </div>
            </div>
          )}
          {enrichment.paymentMethod && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t("finance.payments.method")}</span>
              <Badge variant="secondary" className="text-xs">
                {t(`finance.paymentMethods.${enrichment.paymentMethod}`) || enrichment.paymentMethod}
              </Badge>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
