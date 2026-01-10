import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

// Placeholder components - will be replaced with real implementations
function InvoicesTab() {
  const { t } = useI18n();
  
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
                <p className="text-2xl font-bold text-navy">0</p>
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
                <p className="text-2xl font-bold text-navy">0</p>
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
                <p className="text-2xl font-bold text-navy">0 SAR</p>
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
                <p className="text-2xl font-bold text-navy">0 SAR</p>
                <p className="text-xs text-muted-foreground">{t("finance.invoices.overdue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy mb-2">{t("finance.invoices.empty")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("finance.invoices.emptyDesc")}
          </p>
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.invoices.create")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesTab() {
  const { t } = useI18n();
  
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
                <p className="text-2xl font-bold text-navy">0</p>
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
                <p className="text-2xl font-bold text-navy">0 SAR</p>
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
                <p className="text-2xl font-bold text-navy">0</p>
                <p className="text-xs text-muted-foreground">{t("finance.expenses.pending")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy mb-2">{t("finance.expenses.empty")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("finance.expenses.emptyDesc")}
          </p>
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("finance.expenses.create")}
          </Button>
        </CardContent>
      </Card>
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
          <p className="text-sm text-muted-foreground">
            {t("finance.ledger.emptyDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardFinance() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-navy">{t("finance.title")}</h1>
          <div className="w-10" />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("finance.title")}</h1>
            <p className="text-muted-foreground">{t("finance.subtitle")}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="w-4 h-4" />
              {t("finance.tabs.invoices")}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="w-4 h-4" />
              {t("finance.tabs.expenses")}
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <Wallet className="w-4 h-4" />
              {t("finance.tabs.ledger")}
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
      </main>
    </div>
  );
}
