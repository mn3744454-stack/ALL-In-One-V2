import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, PackagePlus, SlidersHorizontal, Package } from "lucide-react";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import {
  INVENTORY_CATEGORIES,
  useInventoryItems,
  type InventoryItem,
  type TransactionType,
} from "@/hooks/inventory";
import { ItemFormDialog } from "./ItemFormDialog";
import { StockMovementDialog } from "./StockMovementDialog";

export function ItemsList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { items, isLoading, canManage } = useInventoryItems({
    search,
    category,
    lowStockOnly,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [moveType, setMoveType] = useState<TransactionType>("stock_in");

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setFormOpen(true);
  };
  const openMovement = (item: InventoryItem, type: TransactionType) => {
    setMoveItem(item);
    setMoveType(type);
    setMoveOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder={t("inventory.items.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.items.allCategories")}</SelectItem>
              {INVENTORY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`inventory.categories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="icon"
            title={t("inventory.items.lowStockOnly")}
            onClick={() => setLowStockOnly((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 me-1" />
            {t("inventory.items.add")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("inventory.items.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inventory.fields.name")}</TableHead>
                  <TableHead>{t("inventory.fields.category")}</TableHead>
                  <TableHead className="text-end">{t("inventory.movement.currentStock")}</TableHead>
                  <TableHead className="text-end">{t("inventory.fields.costPerUnit")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const low = item.current_quantity <= item.low_stock_threshold;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <BilingualName name={item.name} nameAr={item.name_ar} />
                        {item.sku && (
                          <span className="block text-xs text-muted-foreground">{item.sku}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`inventory.categories.${item.category}`)}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={low ? "text-amber-600 font-semibold" : "font-medium"}>
                          {item.current_quantity} {t(`inventory.units.${item.unit}`)}
                        </span>
                        {low && (
                          <Badge variant="outline" className="ms-2 border-amber-500 text-amber-600">
                            {t("inventory.items.low")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-end text-sm text-muted-foreground">
                        {item.cost_per_unit != null ? item.cost_per_unit : "—"}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("inventory.movement.types.stock_in")}
                              onClick={() => openMovement(item, "stock_in")}
                            >
                              <PackagePlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("inventory.movement.types.adjustment")}
                              onClick={() => openMovement(item, "adjustment")}
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t("common.edit")}
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <StockMovementDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        item={moveItem}
        defaultType={moveType}
      />
    </div>
  );
}
