import { ShoppingCart } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n";

/**
 * Inert Point of Sale surface.
 *
 * Stage B — POS is fenced: this component mounts no operational POS hook,
 * performs no data fetching and contains no invoice, invoice-item, ledger or
 * customer-balance writer. Full POS is deferred to WS-DH-2026-0005.
 */
export default function POSComingSoon() {
  const { t } = useI18n();

  return (
    <DashboardShell>
      <div className="p-4 md:p-6">
        <Card className="max-w-xl mx-auto">
          <CardContent className="flex flex-col items-center text-center gap-4 py-12 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold">{t("finance.pos.title")}</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {t("finance.pos.comingSoon")}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("finance.pos.comingSoonDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
