import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { useDebounce } from "@/hooks/useDebounce";
import { useBoardingContracts } from "@/hooks/boarding/useBoardingContracts";
import { getEligibleTenantTypes } from "@/lib/connections/partnerEligibility";

interface StableResult {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseId: string;
  horseName?: string;
  onCreated?: (contractId: string) => void;
}

/**
 * Owner-initiated Boarding Contract request.
 * Source: tenant_search (public/discoverable stables only).
 */
export function RequestBoardingDialog({
  open,
  onOpenChange,
  horseId,
  horseName,
  onCreated,
}: Props) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const ownerTenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [results, setResults] = useState<StableResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StableResult | null>(null);
  const { create } = useBoardingContracts({ horseId });

  const eligible = getEligibleTenantTypes("boarding_destination");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("search_tenants_for_partnership", {
        _search: debounced,
        _exclude_tenant_id: ownerTenantId,
      });
      if (cancelled) return;
      if (error) {
        setResults([]);
      } else {
        const filtered = ((data ?? []) as StableResult[]).filter((r) =>
          eligible.includes((r.type || "").toLowerCase()),
        );
        setResults(filtered);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, open, ownerTenantId]);

  const submit = async () => {
    if (!selected || !ownerTenantId) return;
    const res = await create.mutateAsync({
      initiator_tenant_id: ownerTenantId,
      initiator_role: "horse_owner",
      counterparty_tenant_id: selected.id,
      horse_id: horseId,
    });
    onCreated?.(res.contract_id);
    onOpenChange(false);
    setSelected(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("boardingContracts.requestBoarding")}</DialogTitle>
          <DialogDescription>
            {horseName
              ? t("boardingContracts.requestBoardingForHorse").replace("{name}", horseName)
              : t("boardingContracts.requestBoardingDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="boarding-stable-search">
              {t("boardingContracts.searchStables")}
            </Label>
            <Input
              id="boarding-stable-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("boardingContracts.searchStablesPlaceholder")}
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border">
            {loading && (
              <div className="p-4 text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                {t("boardingContracts.noStablesFound")}
              </div>
            )}
            {!loading &&
              results.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-start px-3 py-2 hover:bg-muted/60 border-b last:border-b-0 ${
                    selected?.id === r.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="text-sm font-medium">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {r.description}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!selected || create.isPending}>
            {t("boardingContracts.sendRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
