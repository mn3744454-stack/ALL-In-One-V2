import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { useInventoryConsumptionReport } from "@/hooks/inventory";

const PERIODS = [7, 30, 90] as const;

export function ConsumptionReport() {
  const { t } = useI18n();
  const [days, setDays] = useState<number>(30);
  const { data: rows = [], isLoading } = useInventoryConsumptionReport(days);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("inventory.report.title")}
        </h3>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={String(p)}>
                {p} {t("inventory.report.days")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("inventory.report.empty")}</p>
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
                  <TableHead className="text-end">{t("inventory.report.consumed")}</TableHead>
                  <TableHead className="text-end">{t("inventory.report.stockIn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.item_id}>
                    <TableCell>
                      <BilingualName name={r.item_name} nameAr={r.item_name_ar} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t(`inventory.categories.${r.category}`)}
                    </TableCell>
                    <TableCell className="text-end font-medium text-red-600">
                      {r.consumed} {t(`inventory.units.${r.unit}`)}
                    </TableCell>
                    <TableCell className="text-end font-medium text-emerald-600">
                      {r.stockIn} {t(`inventory.units.${r.unit}`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
