import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { useInventoryTransactions, type TransactionType } from "@/hooks/inventory";

const TYPE_TONE: Record<TransactionType, string> = {
  stock_in: "border-emerald-500 text-emerald-600",
  consumption: "border-blue-500 text-blue-600",
  adjustment: "border-amber-500 text-amber-600",
  waste: "border-red-500 text-red-600",
};

interface TransactionsListProps {
  /** Optional item filter (used inside an item detail view). */
  itemId?: string;
}

export function TransactionsList({ itemId }: TransactionsListProps) {
  const { t, dir } = useI18n();
  const { transactions, isLoading } = useInventoryTransactions(itemId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>;
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{t("inventory.transactions.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inventory.transactions.date")}</TableHead>
              {!itemId && <TableHead>{t("inventory.fields.name")}</TableHead>}
              <TableHead>{t("inventory.movement.type")}</TableHead>
              <TableHead className="text-end">{t("inventory.movement.quantity")}</TableHead>
              <TableHead className="text-end">{t("inventory.fields.costPerUnit")}</TableHead>
              <TableHead>{t("inventory.fields.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const type = tx.transaction_type as TransactionType;
              const positive = tx.quantity >= 0;
              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(tx.occurred_at).toLocaleDateString(
                      dir === "rtl" ? "ar" : "en",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </TableCell>
                  {!itemId && (
                    <TableCell>
                      <BilingualName name={tx.item?.name} nameAr={tx.item?.name_ar} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={TYPE_TONE[type] ?? ""}>
                      {t(`inventory.movement.types.${type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-end font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {positive ? "+" : ""}
                    {tx.quantity} {tx.item ? t(`inventory.units.${tx.item.unit}`) : ""}
                  </TableCell>
                  <TableCell className="text-end text-sm text-muted-foreground">
                    {tx.unit_cost != null ? tx.unit_cost : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {tx.notes || (tx.supplier?.name ?? "—")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
