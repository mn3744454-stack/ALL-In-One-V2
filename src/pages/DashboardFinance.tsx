import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { useInvoices, type Invoice, type InvoiceItem } from "@/hooks/finance/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { useExpenses } from "@/hooks/finance/useExpenses";
import { useLedgerEntries } from "@/hooks/finance/useLedger";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
  InvoicesList,
  InvoiceFormDialog,
  InvoiceDetailsSheet,
  ExpensesList,
  ExpenseFormDialog,
} from "@/components/finance";
import { formatCurrency, formatDateTime12h } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "@/components/navigation";
import { isThisMonth, format } from "date-fns";
import { enrichLedgerDescriptions } from "@/lib/finance/enrichLedgerDescriptions";
import { printLedgerEntries, exportLedgerCSV } from "@/components/clients/StatementPrintUtils";
import {
  Menu,
  FileText,
  Receipt,
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Loader2,
  Printer,
  Download,
  CreditCard,
} from "lucide-react";

interface InvoicesTabProps {
  selectedInvoiceId: string | null;
  onInvoiceClick: (invoiceId: string) => void;
}

function InvoicesTab({ selectedInvoiceId, onInvoiceClick }: InvoicesTabProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const { invoices, isLoading, updateInvoice, deleteInvoice } = useInvoices(
    activeTenant?.tenant.id
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreate = hasPermission("finance.invoice.create");

  const stats = useMemo(() => {
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.total_amount, 0);
    const pending = invoices.filter((i) => i.status === "sent").length;
    const overdue = invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + i.total_amount, 0);
    return { total: invoices.length, paid, pending, overdue };
  }, [invoices]);

  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.total")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.pending")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy" dir="ltr">{formatAmount(stats.paid)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.paid")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy" dir="ltr">{formatAmount(stats.overdue)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.overdue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.invoices.create")}
          </Button>
        </div>
      )}

      <InvoicesList
        invoices={invoices}
        loading={isLoading}
        onDelete={deleteInvoice}
        onUpdateStatus={async (id, status) => {
          await updateInvoice({ id, status: status as any });
        }}
        onInvoiceClick={onInvoiceClick}
        selectedInvoiceId={selectedInvoiceId}
      />

      <InvoiceFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

function ExpensesTab() {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { expenses, isLoading, updateExpense, deleteExpense } = useExpenses(
    activeTenant?.tenant.id
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canManage = activeRole === "owner" || activeRole === "manager";

  const stats = useMemo(() => {
    const thisMonth = expenses
      .filter((e) => isThisMonth(new Date(e.expense_date)))
      .reduce((sum, e) => sum + e.amount, 0);
    const pending = expenses.filter((e) => e.status === "pending").length;
    return {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      thisMonth,
      pending,
    };
  }, [expenses]);

  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy" dir="ltr">{formatAmount(stats.total)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.expenses.total")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy" dir="ltr">{formatAmount(stats.thisMonth)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.expenses.thisMonth")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">{t("finance.expenses.pending")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.expenses.create")}
          </Button>
        </div>
      )}

      <ExpensesList
        expenses={expenses}
        loading={isLoading}
        onDelete={deleteExpense}
        onUpdateStatus={async (id, status) => {
          await updateExpense({ id, status: status as any });
        }}
        canManage={canManage}
      />

      <ExpenseFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

function LedgerTab() {
  const { t, dir, lang } = useI18n();
  const { activeTenant } = useTenant();
  const { isOwner } = usePermissions();
  const tenantId = activeTenant?.tenant?.id;
  const { entries, isLoading } = useLedgerEntries(tenantId);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [enrichedDescs, setEnrichedDescs] = useState<Map<string, string>>(new Map());

  // Auto-run backfill once per tenant (owner only)
  useEffect(() => {
    if (!tenantId || !isOwner) return;
    const key = `ledgerBackfillDone:${tenantId}`;
    if (localStorage.getItem(key) === "true") return;

    let cancelled = false;
    (async () => {
      try {
        const { backfillLedgerDescriptions } = await import("@/lib/finance/backfillLedgerDescriptions");
        const result = await backfillLedgerDescriptions(tenantId);
        if (!cancelled) {
          localStorage.setItem(key, "true");
          if (result.updated > 0) {
            const { toast } = await import("sonner");
            toast.success(`Ledger enrichment: ${result.updated} updated`);
          }
        }
      } catch (err) {
        console.error("Backfill error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [tenantId, isOwner]);

  // Display-level enrichment for old entries (Gate 3 Option B)
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    const genericEntries = entries.filter(
      (e) => e.description && !e.description.includes(" | ")
    );
    if (genericEntries.length === 0) return;

    let cancelled = false;
    (async () => {
      const result = await enrichLedgerDescriptions(
        genericEntries.map((e) => ({
          id: e.id,
          entry_type: e.entry_type,
          description: e.description,
          reference_id: e.reference_id,
          payment_method: e.payment_method,
        }))
      );
      if (!cancelled) {
        const map = new Map<string, string>();
        result.forEach((v, k) => map.set(k, v.display));
        setEnrichedDescs(map);
      }
    })();
    return () => { cancelled = true; };
  }, [entries]);

  const getDesc = (entry: any) => enrichedDescs.get(entry.id) || entry.description || "-";

  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (dateFrom && e.created_at < dateFrom) return false;
      if (dateTo && e.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const clientSet = new Set(entries.map(e => e.client_id).filter(Boolean));
    const totalReceivable = entries
      .filter(e => e.entry_type === 'invoice')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const totalPaid = entries
      .filter(e => e.entry_type === 'payment')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    return { customers: clientSet.size, receivable: totalReceivable, collected: totalPaid };
  }, [entries]);

  const handlePrint = () => {
    const printEntries = filteredEntries.map((e) => ({
      id: e.id,
      date: e.created_at,
      entry_type: t(`finance.ledger.entryTypes.${e.entry_type}`) || e.entry_type,
      description: getDesc(e),
      debit: e.amount > 0 ? e.amount : 0,
      credit: e.amount < 0 ? Math.abs(e.amount) : 0,
      balance: e.balance_after,
    }));
    printLedgerEntries({
      title: dir === "rtl" ? "دفتر الحسابات" : "General Ledger",
      entries: printEntries,
      totalDebits: stats.receivable,
      totalCredits: stats.collected,
      isRTL: dir === "rtl",
      lang,
    });
  };

  const handleExportCSV = () => {
    const csvEntries = filteredEntries.map((e) => ({
      date: e.created_at,
      entry_type: e.entry_type,
      description: getDesc(e),
      debit: e.amount > 0 ? e.amount : 0,
      credit: e.amount < 0 ? Math.abs(e.amount) : 0,
      balance: e.balance_after,
    }));
    exportLedgerCSV({
      filename: `ledger-${dateFrom || "all"}-${dateTo || "all"}.csv`,
      entries: csvEntries,
      lang,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.customers}</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.customers")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy font-mono tabular-nums" dir="ltr">{formatAmount(stats.receivable)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.receivable")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy font-mono tabular-nums" dir="ltr">{formatAmount(stats.collected)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.collected")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("common.from")}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("common.to")}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredEntries.length === 0}>
            <Printer className="h-4 w-4 me-1" />
            <span className="hidden sm:inline">{t("clients.statement.print")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredEntries.length === 0}>
            <Download className="h-4 w-4 me-1" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Entries Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-navy mb-2">{t("finance.ledger.empty")}</h3>
            <p className="text-sm text-muted-foreground">{t("finance.ledger.emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">{t("common.date")}</TableHead>
                  <TableHead className="w-[90px]">{t("common.type")}</TableHead>
                  <TableHead className={cn(dir === "rtl" ? "text-right" : "text-left")}>{t("common.description")}</TableHead>
                  <TableHead className="w-[110px]">{t("finance.ledger.debit")}</TableHead>
                  <TableHead className="w-[110px]">{t("finance.ledger.credit")}</TableHead>
                  <TableHead className="w-[110px]">{t("clients.statement.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const isDebit = entry.amount > 0;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap" dir="ltr">
                        {formatDateTime12h(entry.created_at, lang)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.entry_type === 'payment' ? 'default' : 'secondary'} className="text-xs">
                          {t(`finance.ledger.entryTypes.${entry.entry_type}`) || entry.entry_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("max-w-[400px] truncate", dir === "rtl" ? "text-right" : "text-left")} title={getDesc(entry)}>{getDesc(entry)}</TableCell>
                      <TableCell className="font-mono tabular-nums" dir="ltr">
                        {isDebit ? formatAmount(entry.amount) : "-"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums text-primary" dir="ltr">
                        {!isDebit ? formatAmount(Math.abs(entry.amount)) : "-"}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums font-medium" dir="ltr">
                        {formatAmount(entry.balance_after)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked rows */}
          <div className="sm:hidden divide-y border rounded-md">
            {filteredEntries.map((entry) => {
              const isDebit = entry.amount > 0;
              return (
                <div key={entry.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={entry.entry_type === 'payment' ? 'default' : 'secondary'} className="text-xs">
                      {t(`finance.ledger.entryTypes.${entry.entry_type}`) || entry.entry_type}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {formatDateTime12h(entry.created_at, lang)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{getDesc(entry)}</p>
                  <div className="flex items-center justify-between text-sm font-mono tabular-nums" dir="ltr">
                    <div className="flex gap-4">
                      {isDebit && <span className="text-destructive">{formatAmount(entry.amount)}</span>}
                      {!isDebit && <span className="text-primary">{formatAmount(Math.abs(entry.amount))}</span>}
                    </div>
                    <span className="font-medium">{formatAmount(entry.balance_after)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PaymentsTab() {
  const { t, dir, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { entries, isLoading } = useLedgerEntries(tenantId);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [enrichedDescs, setEnrichedDescs] = useState<Map<string, string>>(new Map());

  // Enrich payment descriptions
  useEffect(() => {
    const paymentOnly = entries.filter((e) => e.entry_type === "payment");
    if (paymentOnly.length === 0) return;
    let cancelled = false;
    (async () => {
      const result = await enrichLedgerDescriptions(
        paymentOnly.map((e) => ({
          id: e.id,
          entry_type: e.entry_type,
          description: e.description,
          reference_id: e.reference_id,
          payment_method: e.payment_method,
        }))
      );
      if (!cancelled) {
        const map = new Map<string, string>();
        result.forEach((v, k) => map.set(k, v.display));
        setEnrichedDescs(map);
      }
    })();
    return () => { cancelled = true; };
  }, [entries]);

  const getPaymentDesc = (entry: any) => enrichedDescs.get(entry.id) || entry.description || "-";

  // Filter to payment entries only
  const paymentEntries = useMemo(() => {
    let result = entries.filter((e) => e.entry_type === "payment");

    if (dateFrom) result = result.filter((e) => e.created_at >= dateFrom);
    if (dateTo) result = result.filter((e) => e.created_at <= dateTo + "T23:59:59");
    if (methodFilter !== "all") result = result.filter((e) => e.payment_method === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.payment_method?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, dateFrom, dateTo, methodFilter, search]);

  const stats = useMemo(() => {
    const total = paymentEntries.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const methods = new Set(paymentEntries.map((e) => e.payment_method).filter(Boolean));
    return { total, count: paymentEntries.length, methods: [...methods] };
  }, [paymentEntries]);

  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  const uniqueMethods = useMemo(() => {
    const methods = new Set(entries.filter(e => e.entry_type === 'payment').map(e => e.payment_method).filter(Boolean));
    return [...methods] as string[];
  }, [entries]);

  const handlePrint = () => {
    const printEntries = paymentEntries.map((e) => ({
      id: e.id,
      date: e.created_at,
      entry_type: e.payment_method || t("finance.ledger.entryTypes.payment"),
      description: getPaymentDesc(e),
      debit: 0,
      credit: Math.abs(e.amount),
      balance: e.balance_after,
    }));
    printLedgerEntries({
      title: dir === "rtl" ? "سجل المدفوعات" : "Payments Register",
      entries: printEntries,
      totalDebits: 0,
      totalCredits: stats.total,
      isRTL: dir === "rtl",
      lang,
    });
  };

  const handleExportCSV = () => {
    const csvEntries = paymentEntries.map((e) => ({
      date: e.created_at,
      entry_type: e.payment_method || "payment",
      description: getPaymentDesc(e),
      debit: 0,
      credit: Math.abs(e.amount),
      balance: e.balance_after,
    }));
    exportLedgerCSV({
      filename: `payments-${dateFrom || "all"}-${dateTo || "all"}.csv`,
      entries: csvEntries,
      lang,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.count}</p>
                <p className="text-xs text-muted-foreground">{t("finance.payments.viewPayments")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy font-mono tabular-nums" dir="ltr">{formatAmount(stats.total)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.collected")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{stats.methods.length}</p>
                <p className="text-xs text-muted-foreground">{t("finance.payments.method")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("common.from")}</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-44" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("common.to")}</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-44" />
          </div>
          {uniqueMethods.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("finance.payments.method")}</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-36"
              >
                <option value="all">{t("common.all")}</option>
                {uniqueMethods.map((m) => (
                  <option key={m} value={m}>
                    {t(`finance.paymentMethods.${m}`) || m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={paymentEntries.length === 0}>
            <Printer className="h-4 w-4 me-1" />
            <span className="hidden sm:inline">{t("clients.statement.print")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={paymentEntries.length === 0}>
            <Download className="h-4 w-4 me-1" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : paymentEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-navy mb-2">{t("finance.payments.noPayments")}</h3>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-start p-3 font-medium w-[160px]">{t("common.date")}</th>
                  <th className="text-start p-3 font-medium">{t("common.description")}</th>
                  <th className="text-center p-3 font-medium w-[100px]">{t("finance.payments.method")}</th>
                  <th className="text-center p-3 font-medium w-[120px]">{t("finance.payments.amount")}</th>
                  <th className="text-center p-3 font-medium w-[110px]">{t("clients.statement.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {paymentEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs whitespace-nowrap" dir="ltr">
                      {formatDateTime12h(entry.created_at, lang)}
                    </td>
                    <td className={cn("p-3 max-w-[400px] truncate", dir === "rtl" ? "text-right" : "text-left")} title={entry.description || ""}>
                      {entry.description || "-"}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {t(`finance.paymentMethods.${entry.payment_method}`) || entry.payment_method || "-"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums text-primary" dir="ltr">
                      {formatAmount(Math.abs(entry.amount))}
                    </td>
                    <td className="p-3 text-center font-mono tabular-nums font-medium" dir="ltr">
                      {formatAmount(entry.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked */}
          <div className="sm:hidden divide-y border rounded-md">
            {paymentEntries.map((entry) => (
              <div key={entry.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs">
                    {t(`finance.paymentMethods.${entry.payment_method}`) || entry.payment_method || "-"}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {formatDateTime12h(entry.created_at, lang)}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground truncate">{entry.description}</p>
                )}
                <div className="flex items-center justify-between text-sm font-mono tabular-nums" dir="ltr">
                  <span className="text-primary">{formatAmount(Math.abs(entry.amount))}</span>
                  <span className="font-medium">{formatAmount(entry.balance_after)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type FinanceTab = "invoices" | "expenses" | "ledger" | "payments";

interface DashboardFinanceProps {
  initialTab?: FinanceTab;
}

export default function DashboardFinance({ initialTab }: DashboardFinanceProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceItems, setEditingInvoiceItems] = useState<InvoiceItem[]>([]);
  
  const selectedInvoiceId = searchParams.get("selected");
  
  const [activeTab, setActiveTab] = useState<FinanceTab>(
    selectedInvoiceId ? "invoices" : (initialTab || "invoices")
  );
  
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();

  useEffect(() => {
    if (initialTab && !selectedInvoiceId) {
      setActiveTab(initialTab);
    }
  }, [initialTab, selectedInvoiceId]);

  const handleInvoiceClick = (invoiceId: string) => {
    setSearchParams({ selected: invoiceId });
  };

  const handleCloseInvoiceDetails = (open: boolean) => {
    if (!open) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("selected");
      setSearchParams(newParams);
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    const { data: items } = await supabase
      .from("invoice_items" as any)
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true });
    
    setEditingInvoice(invoice);
    setEditingInvoiceItems((items || []) as unknown as InvoiceItem[]);
    handleCloseInvoiceDetails(false);
  };

  const handleEditComplete = () => {
    setEditingInvoice(null);
    setEditingInvoiceItems([]);
  };

  return (
    <div className="min-h-screen bg-cream flex">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <MobilePageHeader title={t("finance.title")} />

        <div className="p-4 lg:p-8">

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("finance.title")}</h1>
            <p className="text-muted-foreground">{t("finance.subtitle")}</p>
          </div>
          
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FinanceTab)}>
          <TabsList className="mb-4 lg:mb-6 w-full grid grid-cols-4 h-auto p-1">
            <TabsTrigger value="invoices" className="gap-2 px-3 py-2.5 text-xs sm:text-sm">
              <FileText className="w-5 h-5" />
              <span>{t("finance.tabs.invoices")}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2 px-3 py-2.5 text-xs sm:text-sm">
              <Receipt className="w-5 h-5" />
              <span>{t("finance.tabs.expenses")}</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 px-3 py-2.5 text-xs sm:text-sm">
              <CreditCard className="w-5 h-5" />
              <span>{t("finance.tabs.payments")}</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2 px-3 py-2.5 text-xs sm:text-sm">
              <Wallet className="w-5 h-5" />
              <span>{t("finance.tabs.ledger")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <InvoicesTab 
              selectedInvoiceId={selectedInvoiceId} 
              onInvoiceClick={handleInvoiceClick} 
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="ledger">
            <LedgerTab />
          </TabsContent>
        </Tabs>
        </div>

        {/* Invoice Details Sheet */}
        <InvoiceDetailsSheet
          open={!!selectedInvoiceId}
          onOpenChange={handleCloseInvoiceDetails}
          invoiceId={selectedInvoiceId}
          onEdit={handleEditInvoice}
        />

        {/* Invoice Edit Dialog */}
        <InvoiceFormDialog
          open={!!editingInvoice}
          onOpenChange={(open) => !open && handleEditComplete()}
          mode="edit"
          invoice={editingInvoice}
          existingItems={editingInvoiceItems}
          onSuccess={handleEditComplete}
        />
      </main>
    </div>
  );
}
