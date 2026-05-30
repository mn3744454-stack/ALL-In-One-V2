import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Boxes, AlertTriangle, Archive, ArchiveRestore, Search, Package } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import {
  useInventoryItems,
  useInventoryTransactions,
  type InventoryItem,
} from "@/hooks/inventory";
import { InventoryItemFormDialog } from "@/components/inventory/InventoryItemFormDialog";
import { InventoryTransactionFormDialog } from "@/components/inventory/InventoryTransactionFormDialog";

export default function DashboardInventory() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRTL = dir === "rtl";

  const tab = searchParams.get("tab") === "transactions" ? "transactions" : "items";
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const {
    items,
    isLoading,
    lowStockItems,
    createItem,
    updateItem,
    archiveItem,
    restoreItem,
    isCreating,
    isUpdating,
  } = useInventoryItems({ includeArchived: showArchived });

  const {
    transactions,
    isLoading: txLoading,
    createTransaction,
    isCreating: isCreatingTx,
  } = useInventoryTransactions();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.name_ar ?? "").toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const itemById = useMemo(() => {
    const m: Record<string, InventoryItem> = {};
    for (const it of items) m[it.id] = it;
    return m;
  }, [items]);

  if (!activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center">
            <CardContent className="py-12">
              <Boxes className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">
                {t("services.noTenant")}
              </h2>
              <Button onClick={() => navigate("/dashboard")}>
                {t("common.goToDashboard")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <MobilePageHeader title={t("inventory.title")} backTo="/dashboard" />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-navy mb-1">
              {t("inventory.title")}
            </h1>
            <p className="text-muted-foreground">{t("inventory.subtitle")}</p>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  {t("inventory.lowStockAlert")}
                </p>
                <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                  {t("inventory.lowStockCount").replace("{{count}}", String(lowStockItems.length))}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              {t("inventory.items")}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Boxes className="h-4 w-4" />
              {t("inventory.transactions")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-3" : "left-3"} h-4 w-4 text-muted-foreground`} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common.search")}
                  className={isRTL ? "pr-9" : "pl-9"}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-archived"
                    checked={showArchived}
                    onCheckedChange={setShowArchived}
                  />
                  <Label htmlFor="show-archived" className="text-sm">
                    {t("inventory.showArchived")}
                  </Label>
                </div>
                <InventoryItemFormDialog
                  onSubmit={async (data) => { await createItem(data); }}
                  isLoading={isCreating}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {t("inventory.noItems")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => {
                  const isLow =
                    Number(item.current_quantity) <= Number(item.low_stock_threshold);
                  return (
                    <Card key={item.id} className={item.is_archived ? "opacity-60" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{item.name}</h3>
                            {item.name_ar && (
                              <p className="text-sm text-muted-foreground truncate" dir="rtl">
                                {item.name_ar}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {item.is_archived && (
                              <Badge variant="outline">{t("inventory.archived")}</Badge>
                            )}
                            {isLow && !item.is_archived && (
                              <Badge variant="destructive">{t("inventory.lowStock")}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">
                            {t(`inventory.categories.${item.category}` as any) || item.category}
                          </Badge>
                          {item.sku && <Badge variant="outline">{item.sku}</Badge>}
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted-foreground">
                            {t("inventory.currentQuantity")}
                          </span>
                          <span className={`font-display text-lg font-bold ${isLow ? "text-destructive" : "text-navy"}`}>
                            {item.current_quantity} {t(`inventory.units.${item.unit}` as any) || item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <InventoryItemFormDialog
                            item={item}
                            onSubmit={async (data) => {
                              await updateItem({ id: item.id, ...data });
                            }}
                            isLoading={isUpdating}
                          />
                          <InventoryTransactionFormDialog
                            items={items}
                            defaultItemId={item.id}
                            onSubmit={async (data) => { await createTransaction(data); }}
                            isLoading={isCreatingTx}
                            trigger={
                              <Button variant="ghost" size="sm">
                                {t("inventory.newTransaction")}
                              </Button>
                            }
                          />
                          <div className="flex-1" />
                          {item.is_archived ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => restoreItem(item.id)}
                              aria-label={t("inventory.restore")}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => archiveItem(item.id)}
                              aria-label={t("inventory.archive")}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-0 space-y-4">
            <div className="flex justify-end">
              <InventoryTransactionFormDialog
                items={items}
                onSubmit={async (data) => { await createTransaction(data); }}
                isLoading={isCreatingTx}
              />
            </div>
            {txLoading ? (
              <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
            ) : transactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("inventory.noTransactions")}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const item = itemById[tx.item_id];
                  const typeLabel =
                    tx.transaction_type === "stock_in"
                      ? t("inventory.stockIn")
                      : tx.transaction_type === "stock_out"
                      ? t("inventory.stockOut")
                      : t("inventory.adjustment");
                  const variant: "default" | "secondary" | "destructive" =
                    tx.transaction_type === "stock_in"
                      ? "default"
                      : tx.transaction_type === "stock_out"
                      ? "destructive"
                      : "secondary";
                  return (
                    <Card key={tx.id}>
                      <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                        <Badge variant={variant}>{typeLabel}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item?.name ?? tx.item_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.occurred_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-end">
                          <p className="font-display font-bold">
                            {tx.transaction_type === "stock_out" ? "−" : tx.transaction_type === "stock_in" ? "+" : "±"}
                            {tx.quantity}
                          </p>
                          {tx.total_cost != null && (
                            <p className="text-xs text-muted-foreground">
                              {Number(tx.total_cost).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
