import { useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useExpenses } from "@/hooks/finance/useExpenses";
import { useFinanceDemo } from "@/hooks/finance/useFinanceDemo";
import {
  InvoicesList,
  InvoiceFormDialog,
  ExpensesList,
  ExpenseFormDialog,
} from "@/components/finance";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "@/components/navigation";
import { isThisMonth } from "date-fns";
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
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";

function InvoicesTab() {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { invoices, isLoading, updateInvoice, deleteInvoice } = useInvoices(
    activeTenant?.tenant.id
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canManage = activeRole === "owner" || activeRole === "manager";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
                <p className="text-2xl font-bold text-navy">{formatCurrency(stats.paid)}</p>
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
                <p className="text-2xl font-bold text-navy">{formatCurrency(stats.overdue)}</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.overdue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.invoices.create")}
          </Button>
        </div>
      )}

      {/* List */}
      <InvoicesList
        invoices={invoices}
        loading={isLoading}
        onDelete={deleteInvoice}
        onUpdateStatus={async (id, status) => {
          await updateInvoice({ id, status: status as any });
        }}
        canManage={canManage}
      />

      {/* Create Dialog */}
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">{formatCurrency(stats.total)}</p>
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
                <p className="text-2xl font-bold text-navy">{formatCurrency(stats.thisMonth)}</p>
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

      {/* Create Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.expenses.create")}
          </Button>
        </div>
      )}

      {/* List */}
      <ExpensesList
        expenses={expenses}
        loading={isLoading}
        onDelete={deleteExpense}
        onUpdateStatus={async (id, status) => {
          await updateExpense({ id, status: status as any });
        }}
        canManage={canManage}
      />

      {/* Create Dialog */}
      <ExpenseFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}

function LedgerTab() {
  const { t } = useI18n();

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
                <p className="text-2xl font-bold text-navy">0</p>
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
                <p className="text-2xl font-bold text-navy">0 SAR</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.receivable")}</p>
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
                <p className="text-2xl font-bold text-navy">0 SAR</p>
                <p className="text-xs text-muted-foreground">{t("finance.ledger.overdue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy mb-2">{t("finance.ledger.empty")}</h3>
          <p className="text-sm text-muted-foreground">{t("finance.ledger.emptyDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardFinanceProps {
  initialTab?: "invoices" | "expenses" | "ledger";
}

export default function DashboardFinance({ initialTab }: DashboardFinanceProps = {}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || "invoices");
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();
  const {
    canManageDemo,
    demoExists,
    loadDemoData,
    removeDemoData,
    isLoading: isDemoLoading,
    isRemoving,
  } = useFinanceDemo();

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Mobile Page Header */}
        <MobilePageHeader title={t("finance.title")} />

        <div className="p-4 lg:p-8">

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("finance.title")}</h1>
            <p className="text-muted-foreground">{t("finance.subtitle")}</p>
          </div>
          
          {/* Demo Actions */}
          {canManageDemo && (
            <div className="flex gap-2">
              {demoExists ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeDemoData()}
                  disabled={isRemoving}
                  className="gap-2"
                >
                  {isRemoving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t("common.removeDemo")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDemoData()}
                  disabled={isDemoLoading}
                  className="gap-2"
                >
                  {isDemoLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {t("common.loadDemo")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Demo Actions */}
        {canManageDemo && (
          <div className="lg:hidden flex justify-end mb-4">
            {demoExists ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeDemoData()}
                disabled={isRemoving}
                className="gap-2"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden xs:inline">{t("common.removeDemo")}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDemoData()}
                disabled={isDemoLoading}
                className="gap-2"
              >
                {isDemoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="hidden xs:inline">{t("common.loadDemo")}</span>
              </Button>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "invoices" | "expenses" | "ledger")}>
          <TabsList className="mb-4 lg:mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline">{t("finance.tabs.invoices")}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5 text-xs sm:text-sm">
              <Receipt className="w-4 h-4" />
              <span className="hidden xs:inline">{t("finance.tabs.expenses")}</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-1.5 text-xs sm:text-sm">
              <Wallet className="w-4 h-4" />
              <span className="hidden xs:inline">{t("finance.tabs.ledger")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>

          <TabsContent value="ledger">
            <LedgerTab />
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
}
