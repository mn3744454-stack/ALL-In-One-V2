import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { useClients, Client } from "@/hooks/useClients";
import { useLedgerBalances } from "@/hooks/finance/useLedgerBalance";
import { ClientStatementTab } from "@/components/clients";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { formatCurrency } from "@/lib/formatters";
import { Search, Menu, Wallet, FileText, CreditCard, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceCustomerBalances() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, dir } = useI18n();
  const { clients, loading: clientsLoading } = useClients();
  const { getBalance, loading: balancesLoading } = useLedgerBalances();

  const [search, setSearch] = useState("");
  const [statementClient, setStatementClient] = useState<Client | null>(null);
  const [paymentClientId, setPaymentClientId] = useState<string | null>(null);

  const loading = clientsLoading || balancesLoading;

  // Filter clients
  const filteredClients = useMemo(() => {
    let result = clients;

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.name_ar?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
    }

    return result;
  }, [clients, search]);

  // Enrich clients with ledger balance
  const clientsWithBalances = useMemo(() => {
    return filteredClients.map((client) => {
      const ledgerBalance = getBalance(client.id);
      const creditLimit = client.credit_limit || 0;
      const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - ledgerBalance) : null;
      
      return {
        ...client,
        ledgerBalance,
        creditLimit,
        availableCredit,
      };
    });
  }, [filteredClients, getBalance]);

  const handleViewStatement = (client: Client) => {
    setStatementClient(client);
  };

  const handleRecordPayment = (clientId: string) => {
    setPaymentClientId(clientId);
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) return { variant: "destructive" as const, icon: AlertTriangle, label: t("finance.customerBalances.owes") };
    if (balance < 0) return { variant: "secondary" as const, icon: MinusCircle, label: t("finance.customerBalances.credit") };
    return { variant: "outline" as const, icon: CheckCircle2, label: t("finance.customerBalances.settled") };
  };

  const getClientName = (client: Client) => {
    if (dir === "rtl" && client.name_ar) {
      return client.name_ar;
    }
    return client.name;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
      />
      
      <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("finance.customerBalances.title")} showBack />

        {/* Desktop Header with Sidebar trigger */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t("finance.customerBalances.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("finance.customerBalances.description")}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 w-full">
          {/* Search */}
          <div className="relative w-full">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              dir === "rtl" ? "right-3" : "left-3"
            )} />
            <Input
              type="search"
              placeholder={t("clients.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn("w-full", dir === "rtl" ? "pr-10" : "pl-10")}
            />
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredClients.length} {t("clients.title").toLowerCase()}
          </div>

          {/* Balances Table */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("clients.form.phone")}</TableHead>
                    <TableHead className="text-center">{t("finance.customerBalances.balance")}</TableHead>
                    <TableHead className="text-center hidden md:table-cell">{t("clients.form.creditLimit")}</TableHead>
                    <TableHead className="text-center hidden md:table-cell">{t("finance.customerBalances.available")}</TableHead>
                    <TableHead className="text-end">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsWithBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientsWithBalances.map((client) => {
                      const status = getBalanceStatus(client.ledgerBalance);
                      const StatusIcon = status.icon;
                      
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">
                            {getClientName(client)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground" dir="ltr">
                            {client.phone || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {formatCurrency(Math.abs(client.ledgerBalance))}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            {client.creditLimit > 0 
                              ? formatCurrency(client.creditLimit) 
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            {client.availableCredit !== null 
                              ? formatCurrency(client.availableCredit) 
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewStatement(client)}
                              >
                                <FileText className="h-4 w-4 me-1" />
                                <span className="hidden sm:inline">{t("clients.statement.view")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRecordPayment(client.id)}
                              >
                                <CreditCard className="h-4 w-4 me-1" />
                                <span className="hidden sm:inline">{t("finance.payments.record")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Statement Sheet */}
      <Sheet open={!!statementClient} onOpenChange={(open) => !open && setStatementClient(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("clients.statement.title")}</SheetTitle>
          </SheetHeader>
          {statementClient && (
            <div className="mt-4">
              <ClientStatementTab 
                clientId={statementClient.id} 
                clientName={statementClient.name}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Record Payment Dialog - placeholder for client-level payment */}
      {paymentClientId && (
        <RecordPaymentDialog
          open={!!paymentClientId}
          onOpenChange={(open) => !open && setPaymentClientId(null)}
          invoiceId={null}
          onSuccess={() => setPaymentClientId(null)}
        />
      )}
    </div>
  );
}
