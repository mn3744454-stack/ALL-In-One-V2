import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useFinancialEntries } from "@/hooks/finance/useFinancialEntries";
import { formatCurrency } from "@/lib/formatters";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Landmark, Search, TrendingDown, DollarSign } from "lucide-react";

const SOURCE_TYPE_ICONS: Record<string, string> = {
  vet_treatment: "vet",
  vaccination: "vet",
};

export function InternalCostsTab() {
  const { t, lang } = useI18n();
  const { entries, loading } = useFinancialEntries();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  // Filter to internal (non-income) cost entries only
  const internalCosts = useMemo(() => {
    return entries.filter((e) => e.is_income === false);
  }, [entries]);

  const filtered = useMemo(() => {
    return internalCosts.filter((e) => {
      if (entityFilter !== "all" && e.entity_type !== entityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (e.notes || "").toLowerCase().includes(q) ||
          e.entity_type.toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [internalCosts, entityFilter, search]);

  const stats = useMemo(() => {
    const totalCost = internalCosts.reduce((sum, e) => sum + (e.actual_cost || 0), 0);
    const entityTypes = new Set(internalCosts.map((e) => e.entity_type));
    return { totalCost, count: internalCosts.length, entityTypes: Array.from(entityTypes) };
  }, [internalCosts]);

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case "vet_treatment": return t("finance.internalCosts.sources.vetTreatment");
      case "vaccination": return t("finance.internalCosts.sources.vaccination");
      default: return entityType;
    }
  };

  const getServiceModeLabel = (mode: string) => {
    switch (mode) {
      case "internal": return t("finance.internalCosts.modeInternal");
      case "external": return t("finance.internalCosts.modeExternal");
      default: return mode;
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.totalRecords")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.totalCost")}</p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-destructive mt-1" dir="ltr">
              {formatCurrency(stats.totalCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("finance.internalCosts.stats.categories")}</p>
            </div>
            <p className="text-lg font-bold mt-1">{stats.entityTypes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("finance.internalCosts.searchPlaceholder")}
            className="ps-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="vet_treatment">{t("finance.internalCosts.sources.vetTreatment")}</SelectItem>
            <SelectItem value="vaccination">{t("finance.internalCosts.sources.vaccination")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Landmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t("finance.internalCosts.noRecords")}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("finance.internalCosts.source")}</TableHead>
                      <TableHead>{t("finance.internalCosts.serviceMode")}</TableHead>
                      <TableHead className="text-center">{t("finance.internalCosts.cost")}</TableHead>
                      <TableHead>{t("common.notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm" dir="ltr">
                          {formatStandardDate(entry.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getEntityLabel(entry.entity_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {getServiceModeLabel(entry.service_mode)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono tabular-nums font-medium" dir="ltr">
                          {formatCurrency(entry.actual_cost || 0, entry.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y border rounded-md">
                {filtered.map((entry) => (
                  <div key={entry.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getEntityLabel(entry.entity_type)}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {formatStandardDate(entry.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getServiceModeLabel(entry.service_mode)}
                      </Badge>
                      <span className="font-mono tabular-nums font-medium text-destructive" dir="ltr">
                        {formatCurrency(entry.actual_cost || 0, entry.currency)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
