import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/i18n";
import { useClients, Client, ClientStatus, ClientType, CreateClientData } from "@/hooks/useClients";
import { ClientsList, ClientFilters, ClientFormDialog, ClientStatementTab } from "@/components/clients";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Plus, Search, Users, Menu } from "lucide-react";

export default function DashboardClients() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();
  const { clients, loading, canManage, createClient, updateClient, deleteClient } = useClients();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all" | "withBalance">("all");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [statementClient, setStatementClient] = useState<Client | null>(null);

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
          c.email?.toLowerCase().includes(query) ||
          c.phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter === "withBalance") {
      result = result.filter((c) => (c.outstanding_balance || 0) > 0);
    } else if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((c) => c.type === typeFilter);
    }

    return result;
  }, [clients, search, statusFilter, typeFilter]);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = (client: Client) => {
    setDeleteConfirm(client);
  };

  const handleViewStatement = (client: Client) => {
    setStatementClient(client);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteClient(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleSave = async (data: CreateClientData) => {
    if (editingClient) {
      return await updateClient(editingClient.id, data);
    }
    return await createClient(data);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingClient(null);
    }
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
        <MobilePageHeader title={t("clients.title")} showBack />

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
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t("clients.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("clients.description")}</p>
              </div>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t("clients.create")}
            </Button>
          )}
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 w-full">

        {/* Mobile Add Button */}
        {canManage && (
          <div className="lg:hidden">
            <Button onClick={() => setFormOpen(true)} className="w-full">
              <Plus className="h-4 w-4 me-2" />
              {t("clients.create")}
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("clients.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Filters */}
        <ClientFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
        />

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} {t("clients.title").toLowerCase()}
        </div>

        {/* Client List */}
        <ClientsList
          clients={filteredClients}
          loading={loading}
          canManage={canManage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewStatement={handleViewStatement}
        />
        </div>
      </main>

      {/* Form Dialog */}
      <ClientFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        client={editingClient}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteConfirm.description").replace("{{name}}", deleteConfirm?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}
