import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface TenantResult {
  id: string;
  name: string;
  type: string;
}

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (recipientTenantId: string) => void;
  isLoading?: boolean;
  /** Filter search results to specific tenant types (e.g., ['laboratory', 'lab']) */
  typeFilter?: string[];
}

export function AddPartnerDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  typeFilter,
}: AddPartnerDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TenantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantResult | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  // Search tenants via RPC
  useEffect(() => {
    if (!open) return;

    const searchTenants = async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.rpc("search_tenants_for_partnership", {
          _search: debouncedSearch,
          _exclude_tenant_id: activeTenant?.tenant_id || null,
        });

        if (error) throw error;
        let filtered = (data as TenantResult[]) || [];
        if (typeFilter && typeFilter.length > 0) {
          filtered = filtered.filter(t => typeFilter.includes(t.type?.toLowerCase()));
        }
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    };

    searchTenants();
  }, [debouncedSearch, open, activeTenant?.tenant_id, typeFilter]);

  const handleSubmit = () => {
    if (!selectedTenant) return;
    onSubmit(selectedTenant.id);
  };

  const resetForm = () => {
    setSearch("");
    setResults([]);
    setSelectedTenant(null);
  };

  const getTenantTypeLabel = (type: string) => {
    const key = `onboarding.tenantTypes.${type}`;
    const translated = t(key as keyof typeof t);
    return translated === key ? type.charAt(0).toUpperCase() + type.slice(1) : translated;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("connections.addPartner")}</DialogTitle>
          <DialogDescription>
            {t("connections.addPartnerDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>{t("connections.searchOrganization")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
              <Input
                placeholder={t("connections.searchOrganizationPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedTenant(null);
                }}
                className="pl-9 rtl:pr-9 rtl:pl-3"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[240px] overflow-y-auto space-y-1 border rounded-md p-1">
            {searching ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                {t("common.loading")}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {search ? t("connections.noOrganizationsFound") : t("connections.typeToSearch")}
              </div>
            ) : (
              results.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-md text-start transition-colors ${
                    selectedTenant?.id === tenant.id
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTenant(tenant)}
                >
                  <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {getTenantTypeLabel(tenant.type)}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTenant || isLoading}
          >
            {isLoading ? t("common.loading") : t("connections.sendPartnerRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
