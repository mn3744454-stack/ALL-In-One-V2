import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { useI18n } from "@/i18n";
import { useClients, Client, ClientStatus, ClientType, CreateClientData } from "@/hooks/useClients";
import { useLedgerBalances } from "@/hooks/finance/useLedgerBalance";
import { ClientsList, ClientFilters, ClientFormDialog, ClientsTable } from "@/components/clients";
import { MobilePageHeader } from "@/components/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Plus, Search, Users } from "lucide-react";

export default function DashboardClients() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { clients, loading, canManage, createClient, updateClient, deleteClient } = useClients();
  const { getBalance, loading: balancesLoading } = useLedgerBalances();

  // View preference
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('clients-page');

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all" | "withBalance">("all");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  // Filter clients
  // Enrich clients with ledger-derived balances
  const enrichedClients = useMemo(() => {
    return clients.map(c => ({
      ...c,
      outstanding_balance: getBalance(c.id),
    }));
  }, [clients, getBalance]);

  const filteredClients = useMemo(() => {
    let result = enrichedClients;

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
  }, [enrichedClients, search, statusFilter, typeFilter]);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = (client: Client) => {
    setDeleteConfirm(client);
  };

  const handleViewStatement = (client: Client) => {
    navigate(`/dashboard/clients/${client.id}/statement`);
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
    <DashboardShell
      headerRight={canManage ? (
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("clients.create")}
        </Button>
      ) : undefined}
    >
      <MobilePageHeader title={t("clients.title")} showBack />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 w-full pb-24 lg:pb-6">

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

        {/* SMOKE TEST 6.1: Mobile-optimized filter layout */}
        {/* Filters - Mobile optimized: stacks cleanly, no overflow */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="w-full sm:w-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <ClientFilters
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
            />
          </div>
          <div className="flex-shrink-0 flex justify-end sm:justify-start">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} {t("clients.title").toLowerCase()}
        </div>

        {/* Client List/Table */}
        {viewMode === 'table' ? (
          <ClientsTable
            clients={filteredClients}
            canManage={canManage}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewStatement={handleViewStatement}
          />
        ) : (
          <ClientsList
            clients={filteredClients}
            loading={loading}
            canManage={canManage}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewStatement={handleViewStatement}
            viewMode={viewMode}
            gridColumns={gridColumns}
          />
        )}
      </div>

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
    </DashboardShell>
  );
}
