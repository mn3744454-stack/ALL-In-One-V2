import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { useClientStatement } from "@/hooks/clients/useClientStatement";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/formatters";
import { format, subMonths } from "date-fns";
import { Download, Printer, Calendar, FileText } from "lucide-react";

interface ClientStatementTabProps {
  clientId: string;
  clientName?: string;
}

export function ClientStatementTab({ clientId, clientName }: ClientStatementTabProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  
  const canViewStatement = isOwner || hasPermission("clients.statement.view");
  const canExport = isOwner || hasPermission("clients.statement.export");

  // Default: last 3 months
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { statement, isLoading } = useClientStatement(clientId, dateFrom, dateTo);
  
  const entries = statement?.entries || [];
  const summary = {
    totalDebit: statement?.totalDebits || 0,
    totalCredit: statement?.totalCredits || 0,
    closingBalance: statement?.currentBalance || 0,
  };

  if (!canViewStatement) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("common.noPermission")}
        </CardContent>
      </Card>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ["Date", "Description", "Debit", "Credit", "Balance"];
    const rows = entries.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd HH:mm"),
      e.description || "",
      e.debit > 0 ? e.debit.toFixed(2) : "",
      e.credit > 0 ? e.credit.toFixed(2) : "",
      e.balance.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${clientName || clientId}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("clients.statement.title")}
              </CardTitle>
              <CardDescription>
                {clientName && <span className="font-medium">{clientName}</span>}
              </CardDescription>
            </div>
            {canExport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 me-2" />
                  {t("common.print")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 me-2" />
                  {t("common.export")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("clients.statement.totalDebit")}</p>
            <p className="text-2xl font-bold font-mono tabular-nums" dir="ltr">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalDebit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("clients.statement.totalCredit")}</p>
            <p className="text-2xl font-bold text-primary font-mono tabular-nums" dir="ltr">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalCredit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("clients.statement.closingBalance")}</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${summary.closingBalance > 0 ? "text-destructive" : ""}`} dir="ltr">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.closingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statement Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t("clients.statement.noEntries")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("common.date")}</TableHead>
                    <TableHead>{t("common.description")}</TableHead>
                    <TableHead className="text-center">{t("clients.statement.debit")}</TableHead>
                    <TableHead className="text-center">{t("clients.statement.credit")}</TableHead>
                    <TableHead className="text-center">{t("clients.statement.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center font-mono text-sm tabular-nums" dir="ltr">
                        {format(new Date(entry.date), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t(`finance.payment.entryTypes.${entry.entry_type}`) || entry.entry_type}
                          </Badge>
                          <span className="text-sm">{entry.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                        {entry.debit > 0 ? (
                          <span className="text-destructive">{formatCurrency(entry.debit)}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                        {entry.credit > 0 ? (
                          <span className="text-primary">{formatCurrency(entry.credit)}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium tabular-nums" dir="ltr">
                        {formatCurrency(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
