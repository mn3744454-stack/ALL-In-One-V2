import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { AlertCircle, Package, History, Truck, BarChart3 } from "lucide-react";
import {
  InventoryStatsCards,
  ItemsList,
  TransactionsList,
  SuppliersList,
  ConsumptionReport,
} from "@/components/inventory";

const TABS = ["items", "transactions", "suppliers", "reports"] as const;

export default function DashboardInventory() {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get("tab");
    return urlTab && (TABS as readonly string[]).includes(urlTab) ? urlTab : "items";
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  if (!activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t("inventory.toasts.noOrg")}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <Helmet>
        <title>{t("inventory.title")} | Faras</title>
      </Helmet>

      <MobilePageHeader title={t("inventory.title")} />

      <div className="flex-1 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">{t("inventory.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("inventory.subtitle")}</p>
          </div>
        </div>

        <InventoryStatsCards />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="items" className="gap-2 text-sm font-medium">
              <Package className="h-4 w-4" />
              {t("inventory.tabs.items")}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2 text-sm font-medium">
              <History className="h-4 w-4" />
              {t("inventory.tabs.transactions")}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2 text-sm font-medium">
              <Truck className="h-4 w-4" />
              {t("inventory.tabs.suppliers")}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              {t("inventory.tabs.reports")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-0">
            <ItemsList />
          </TabsContent>
          <TabsContent value="transactions" className="mt-0">
            <TransactionsList />
          </TabsContent>
          <TabsContent value="suppliers" className="mt-0">
            <SuppliersList />
          </TabsContent>
          <TabsContent value="reports" className="mt-0">
            <ConsumptionReport />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
