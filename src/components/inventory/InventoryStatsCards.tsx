import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, Wallet } from "lucide-react";
import { useI18n } from "@/i18n";
import { useInventoryStats } from "@/hooks/inventory";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";

export function InventoryStatsCards() {
  const { t } = useI18n();
  const { data: stats } = useInventoryStats();
  const currency = useTenantCurrency();

  const cards = [
    {
      label: t("inventory.stats.totalItems"),
      value: stats?.totalItems ?? 0,
      icon: Package,
      tone: "text-primary",
    },
    {
      label: t("inventory.stats.lowStock"),
      value: stats?.lowStockCount ?? 0,
      icon: AlertTriangle,
      tone: (stats?.lowStockCount ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground",
    },
    {
      label: t("inventory.stats.stockValue"),
      value: `${(stats?.stockValue ?? 0).toLocaleString()} ${currency}`,
      icon: Wallet,
      tone: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-md bg-muted ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
