import { useEffect, useMemo, useState } from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  CreditCard,
  Package,
  Plus,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useClients, type CreateClientData } from "@/hooks/useClients";
import {
  useBoardingAdmissions,
  type BoardingAdmission,
} from "@/hooks/housing/useBoardingAdmissions";
import {
  useStableServicePlans,
  type StableServicePlan,
} from "@/hooks/useStableServicePlans";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import {
  displayClientName,
  formatBilingualName,
} from "@/lib/displayHelpers";
import { BilingualName } from "@/components/ui/BilingualName";
import { PlanIncludedServicesDisplay } from "@/components/services/PlanIncludedServicesDisplay";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { QuickCreatePackageDialog } from "./QuickCreatePackageDialog";

interface CompletePricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: BoardingAdmission | null;
  onSaved?: () => void;
}

/**
 * Phase 1.e.f.7.d.1 — Complete Pricing dialog.
 * Lets staff resolve commercial context (client, package/plan, rate, currency,
 * billing cycle) for boarding admissions that are operationally active/placed
 * but have no price (typical of connected non-contract recipient admissions).
 *
 * Frontend-only. Uses existing useBoardingAdmissions.updateAdmission. Does NOT
 * auto-create contracts, invoices, or convert horse owners to clients.
 */
export function CompletePricingDialog({
  open,
  onOpenChange,
  admission,
  onSaved,
}: CompletePricingDialogProps) {
  const { t, lang } = useI18n();
  const tenantCurrency = useTenantCurrency();
  const { clients, createClient } = useClients();
  const { activePlans } = useStableServicePlans();
  const { updateAdmission } = useBoardingAdmissions();

  const [clientId, setClientId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [daily, setDaily] = useState<string>("");
  const [monthly, setMonthly] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [currency, setCurrency] = useState<string>(tenantCurrency);
  const [saving, setSaving] = useState(false);

  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addPackageOpen, setAddPackageOpen] = useState(false);

  useEffect(() => {
    if (open && admission) {
      setClientId(admission.client_id);
      setPlanId(admission.plan_id || "");
      setDaily(admission.daily_rate != null ? String(admission.daily_rate) : "");
      setMonthly(
        admission.monthly_rate != null ? String(admission.monthly_rate) : ""
      );
      setBillingCycle(admission.billing_cycle || "monthly");
      setCurrency(admission.rate_currency || tenantCurrency);
      setClientQuery("");
    }
  }, [open, admission, tenantCurrency]);

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "active"),
    [clients]
  );
  const selectedClient = useMemo(
    () => activeClients.find((c) => c.id === clientId) || null,
    [activeClients, clientId]
  );

  const dirtySnapshot = useMemo(
    () => ({ clientId, planId, daily, monthly, billingCycle, currency }),
    [clientId, planId, daily, monthly, billingCycle, currency]
  );
  const { isDirty, resetBaseline } = useDirtyForm(dirtySnapshot, open);

  const dailyNum = daily.trim() === "" ? null : parseFloat(daily);
  const monthlyNum = monthly.trim() === "" ? null : parseFloat(monthly);
  const hasRate =
    (dailyNum != null && !Number.isNaN(dailyNum) && dailyNum > 0) ||
    (monthlyNum != null && !Number.isNaN(monthlyNum) && monthlyNum > 0);

  const canSave = !!admission && hasRate && !saving;

  const handlePlanSelect = (id: string) => {
    if (id === "__none__" || !id) {
      setPlanId("");
      return;
    }
    const plan = activePlans.find((p) => p.id === id);
    if (!plan) return;
    setPlanId(plan.id);
    setBillingCycle(plan.billing_cycle);
    setCurrency(plan.currency);
    if (plan.billing_cycle === "daily") {
      setDaily(String(plan.base_price));
    } else if (plan.billing_cycle === "monthly") {
      setMonthly(String(plan.base_price));
    }
  };

  const handleCreatedClient = async (data: CreateClientData) => {
    const created = await createClient(data);
    if (created?.id) {
      setClientId(created.id);
      setClientQuery("");
    }
    return created;
  };

  const handlePackageCreated = (plan: StableServicePlan) => {
    handlePlanSelect(plan.id);
  };

  const handleSave = async () => {
    if (!admission || !canSave) return;
    setSaving(true);
    try {
      await updateAdmission({
        admissionId: admission.id,
        client_id: clientId || null,
        plan_id: planId || null,
        billing_cycle: billingCycle,
        rate_currency: currency,
        daily_rate:
          dailyNum != null && !Number.isNaN(dailyNum) ? dailyNum : null,
        monthly_rate:
          monthlyNum != null && !Number.isNaN(monthlyNum) ? monthlyNum : null,
      } as any);
      resetBaseline(dirtySnapshot);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const horseLabel = admission
    ? formatBilingualName(
        admission.horse?.name || admission.horse_name_snapshot,
        admission.horse?.name_ar || admission.horse_name_ar_snapshot,
        lang
      )
    : "";

  return (
    <>
      <SafeFormDialog
        open={open}
        onOpenChange={onOpenChange}
        isDirty={isDirty && !saving}
        className="sm:max-w-xl max-h-[85vh] flex flex-col"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t("housing.admissions.completePricing.title")}
            {horseLabel ? (
              <span className="text-muted-foreground font-normal text-sm">
                — {horseLabel}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {t("housing.admissions.completePricing.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pe-1 py-2">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>{t("housing.admissions.completePricing.client")}</Label>
            <div className="flex gap-2">
              <Popover
                open={clientPickerOpen}
                onOpenChange={setClientPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between font-normal"
                  >
                    {selectedClient
                      ? displayClientName(
                          selectedClient.name,
                          selectedClient.name_ar,
                          lang
                        )
                      : t("housing.admissions.wizard.selectClient")}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={true}>
                    <CommandInput
                      value={clientQuery}
                      onValueChange={setClientQuery}
                      placeholder={t(
                        "housing.admissions.detail.searchClientsPlaceholder"
                      )}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          {t("common.noResults")}
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setClientId(null);
                            setClientPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              clientId === null ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">
                            {t("housing.admissions.wizard.noClient")}
                          </span>
                        </CommandItem>
                        {activeClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.name_ar || ""} ${c.email || ""} ${c.phone || ""}`}
                            onSelect={() => {
                              setClientId(c.id);
                              setClientPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                clientId === c.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <BilingualName
                              name={c.name}
                              nameAr={c.name_ar}
                              inline
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddClientOpen(true)}
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4 me-1" />
                {t("housing.admissions.completePricing.addClient")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("housing.admissions.completePricing.clientOptionalHelp")}
            </p>
          </div>

          {/* Package */}
          <div className="space-y-2">
            <Label>{t("housing.admissions.completePricing.package")}</Label>

            {/* No package / manual rates tile */}
            <button
              type="button"
              onClick={() => handlePlanSelect("__none__")}
              className={cn(
                "w-full p-3 rounded-md border text-start transition-colors",
                planId === ""
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("housing.admissions.completePricing.noPackageManual")}
                </span>
                {planId === "" && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </button>

            {activePlans.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center space-y-2">
                <Package className="w-7 h-7 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {t("housing.quickCreate.noPackagesYet")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddPackageOpen(true)}
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t("housing.quickCreate.addNewPackage")}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pe-1">
                  {activePlans.map((plan) => (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan.id)}
                      className={cn(
                        "w-full p-2.5 rounded-md border flex items-center gap-2 text-start transition-colors",
                        planId === plan.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <BilingualName
                          name={plan.name}
                          nameAr={plan.name_ar}
                          primaryClassName="text-sm"
                        />
                        <PlanIncludedServicesDisplay
                          includes={plan.includes}
                          compact
                        />
                        <div className="flex gap-1 mt-0.5 text-[11px] text-muted-foreground">
                          <span>
                            {plan.base_price} {plan.currency}
                          </span>
                          <span>·</span>
                          <span className="capitalize">
                            {plan.billing_cycle}
                          </span>
                        </div>
                      </div>
                      {planId === plan.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddPackageOpen(true)}
                >
                  <Plus className="h-4 w-4 me-1" />
                  {t("housing.quickCreate.addNewPackage")}
                </Button>
              </>
            )}
          </div>

          {/* Manual rates */}
          <div className="space-y-2">
            <Label>
              {t("housing.admissions.completePricing.manualRates")}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="cp-daily"
                  className="text-xs text-muted-foreground"
                >
                  {t("housing.admissions.completePricing.dailyRate")}
                </Label>
                <Input
                  id="cp-daily"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="cp-monthly"
                  className="text-xs text-muted-foreground"
                >
                  {t("housing.admissions.completePricing.monthlyRate")}
                </Label>
                <Input
                  id="cp-monthly"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("housing.admissions.completePricing.billingCycle")}
                </Label>
                <Select
                  value={billingCycle}
                  onValueChange={setBillingCycle}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {t("housing.admissions.wizard.cycleDaily")}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {t("housing.admissions.wizard.cycleWeekly")}
                    </SelectItem>
                    <SelectItem value="monthly">
                      {t("housing.admissions.wizard.cycleMonthly")}
                    </SelectItem>
                    <SelectItem value="yearly">
                      {t("housing.admissions.wizard.cycleYearly")}
                    </SelectItem>
                    <SelectItem value="one-time">
                      {t("housing.admissions.wizard.cycleOnetime")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("housing.admissions.completePricing.currency")}
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!hasRate && (
              <p className="text-[11px] text-amber-600">
                {t("housing.admissions.completePricing.rateRequired")}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 pt-3 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </SafeFormDialog>

      <ClientFormDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        client={null}
        initialName={clientQuery}
        onSave={handleCreatedClient}
      />

      <QuickCreatePackageDialog
        open={addPackageOpen}
        onOpenChange={setAddPackageOpen}
        onCreated={handlePackageCreated}
      />
    </>
  );
}
