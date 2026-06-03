import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useStableServicePlans } from "@/hooks/useStableServicePlans";
import { useBoardingContracts } from "@/hooks/boarding/useBoardingContracts";
import {
  assertNotGlobalSearchForOwners,
  getEligibilitySource,
} from "@/lib/connections/partnerEligibility";

interface OwnerOption {
  client_id: string;
  client_name: string;
  owner_tenant_id: string;
  owner_tenant_name: string;
}

interface HorseOption {
  id: string;
  name: string;
  name_ar?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (contractId: string) => void;
}

/**
 * Stable-initiated Boarding Contract creation.
 *
 * Owner counterparty source MUST be linked clients + accepted b2c connections.
 * Global tenant search of horse_owner tenants is forbidden (private workspaces).
 */
export function CreateBoardingContractDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const stableTenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const { activePlans } = useStableServicePlans();
  const { create } = useBoardingContracts();

  // Compile-time-ish guard: assert that this dialog never uses tenant_search
  // for the owner counterparty context. If a future refactor changes the source
  // this throws and surfaces in dev.
  if (getEligibilitySource("boarding_owner_counterparty") !== "linked_clients_and_connections") {
    assertNotGlobalSearchForOwners("boarding_owner_counterparty");
  }

  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [loadingHorses, setLoadingHorses] = useState(false);
  const [selectedOwnerKey, setSelectedOwnerKey] = useState<string>(""); // `${client_id}::${owner_tenant_id}`
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const selectedOwner = useMemo<OwnerOption | null>(() => {
    if (!selectedOwnerKey) return null;
    const [client_id, owner_tenant_id] = selectedOwnerKey.split("::");
    return owners.find((o) => o.client_id === client_id && o.owner_tenant_id === owner_tenant_id) ?? null;
  }, [owners, selectedOwnerKey]);

  // Load linked clients + accepted b2c owner connections, then dedupe per owner_tenant_id.
  useEffect(() => {
    if (!open || !stableTenantId) return;
    let cancelled = false;
    setLoadingOwners(true);
    (async () => {
      // 1. Local clients with linked_tenant_id pointing at any tenant.
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, linked_tenant_id")
        .eq("tenant_id", stableTenantId)
        .not("linked_tenant_id", "is", null);

      const linkedTenantIds = (clients ?? [])
        .map((c: any) => c.linked_tenant_id)
        .filter(Boolean) as string[];

      // 2. Cross-check tenant type so only horse_owner counterparties appear.
      let ownerTenantsById = new Map<string, { id: string; name: string }>();
      if (linkedTenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, name, type")
          .in("id", linkedTenantIds)
          .eq("type", "horse_owner");
        for (const t of tenants ?? []) {
          ownerTenantsById.set((t as any).id, { id: (t as any).id, name: (t as any).name });
        }
      }

      // 3. Also include accepted b2c owner connections with no local client mapping.
      const { data: conns } = await supabase
        .from("connections")
        .select("id, initiator_tenant_id, recipient_tenant_id, status, connection_type")
        .eq("connection_type", "b2c")
        .eq("status", "accepted")
        .or(`initiator_tenant_id.eq.${stableTenantId},recipient_tenant_id.eq.${stableTenantId}`);

      const counterpartyIds = new Set<string>();
      for (const c of conns ?? []) {
        const other =
          (c as any).initiator_tenant_id === stableTenantId
            ? (c as any).recipient_tenant_id
            : (c as any).initiator_tenant_id;
        if (other) counterpartyIds.add(other);
      }
      const extraIds = [...counterpartyIds].filter((id) => !ownerTenantsById.has(id));
      if (extraIds.length > 0) {
        const { data: extras } = await supabase
          .from("tenants")
          .select("id, name, type")
          .in("id", extraIds)
          .eq("type", "horse_owner");
        for (const t of extras ?? []) {
          ownerTenantsById.set((t as any).id, { id: (t as any).id, name: (t as any).name });
        }
      }

      // Build dedup'd owner options keyed by (client_id, owner_tenant_id).
      const options: OwnerOption[] = [];
      const seen = new Set<string>();
      for (const c of clients ?? []) {
        const ownerTenant = ownerTenantsById.get((c as any).linked_tenant_id);
        if (!ownerTenant) continue;
        const key = `${(c as any).id}::${ownerTenant.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        options.push({
          client_id: (c as any).id,
          client_name: (c as any).name,
          owner_tenant_id: ownerTenant.id,
          owner_tenant_name: ownerTenant.name,
        });
      }

      if (!cancelled) {
        setOwners(options);
        setLoadingOwners(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, stableTenantId]);

  // Load horses for the selected owner tenant.
  useEffect(() => {
    if (!selectedOwner) {
      setHorses([]);
      setSelectedHorseId("");
      return;
    }
    let cancelled = false;
    setLoadingHorses(true);
    (async () => {
      const { data } = await supabase
        .from("horses")
        .select("id, name, name_ar")
        .eq("tenant_id", selectedOwner.owner_tenant_id)
        .order("name");
      if (!cancelled) {
        setHorses((data ?? []) as HorseOption[]);
        setLoadingHorses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOwner?.owner_tenant_id]);

  const reset = () => {
    setSelectedOwnerKey("");
    setSelectedHorseId("");
    setSelectedPlanId("");
  };

  const submit = async () => {
    if (!stableTenantId || !selectedOwner || !selectedHorseId || !selectedPlanId) return;
    const res = await create.mutateAsync({
      initiator_tenant_id: stableTenantId,
      initiator_role: "stable",
      counterparty_tenant_id: selectedOwner.owner_tenant_id,
      horse_id: selectedHorseId,
      plan_id: selectedPlanId,
      client_id: selectedOwner.client_id,
    });
    onCreated?.(res.contract_id);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("boardingContracts.createBoardingContract")}</DialogTitle>
          <DialogDescription>
            {t("boardingContracts.createBoardingContractDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("boardingContracts.ownerCounterparty")}</Label>
            <Select value={selectedOwnerKey} onValueChange={setSelectedOwnerKey}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingOwners
                      ? t("common.loading")
                      : owners.length === 0
                        ? t("boardingContracts.noLinkedOwners")
                        : t("boardingContracts.selectOwner")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => (
                  <SelectItem key={`${o.client_id}::${o.owner_tenant_id}`} value={`${o.client_id}::${o.owner_tenant_id}`}>
                    {o.client_name} · {o.owner_tenant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("boardingContracts.ownerSourceHint")}
            </p>
          </div>

          <div>
            <Label>{t("boardingContracts.horse")}</Label>
            <Select
              value={selectedHorseId}
              onValueChange={setSelectedHorseId}
              disabled={!selectedOwner || loadingHorses}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedOwner
                      ? t("boardingContracts.selectOwnerFirst")
                      : loadingHorses
                        ? t("common.loading")
                        : horses.length === 0
                          ? t("boardingContracts.noHorsesForOwner")
                          : t("boardingContracts.selectHorse")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {horses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                    {h.name_ar ? ` · ${h.name_ar}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("boardingContracts.boardingPackage")}</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    activePlans.length === 0
                      ? t("boardingContracts.noActivePlans")
                      : t("boardingContracts.selectPlan")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.name_ar ? ` · ${p.name_ar}` : ""} — {p.base_price} {p.currency}/{p.billing_cycle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={
              !selectedOwner || !selectedHorseId || !selectedPlanId || create.isPending
            }
          >
            {t("boardingContracts.sendToOwner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
