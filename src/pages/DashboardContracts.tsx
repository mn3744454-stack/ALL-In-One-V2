import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  getVisibleContractTypes,
  resolveActiveContractType,
  MAX_PRIMARY_TABS,
} from "@/contracts/registry";

export default function DashboardContracts() {
  const { t } = useI18n();
  const tenantCtx = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  const visible = useMemo(() => getVisibleContractTypes(tenantCtx), [tenantCtx]);
  const requested = searchParams.get("type");
  const active = resolveActiveContractType(visible, requested);

  const primary = visible.slice(0, MAX_PRIMARY_TABS);
  const overflow = visible.slice(MAX_PRIMARY_TABS);

  const setActive = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("type", key);
    setSearchParams(next, { replace: true });
  };

  const ActiveComponent = active?.component ?? null;

  return (
    <DashboardShell>
      <MobilePageHeader title={t("contracts.pageTitle")} />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy">
              {t("contracts.pageTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("contracts.pageSubtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/contracts/templates">Templates</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/contracts/documents">Documents</Link>
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("contracts.noTypes")}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
              {primary.map((def) => {
                const isActive = active?.key === def.key;
                return (
                  <button
                    key={def.key}
                    type="button"
                    onClick={() => setActive(def.key)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(def.labelKey)}
                  </button>
                );
              })}
              {overflow.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "px-3 py-2 h-auto gap-1 text-sm font-medium border-b-2 -mb-px rounded-none",
                        active && overflow.some((o) => o.key === active.key)
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      {t("contracts.tabs.more")}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {overflow.map((def) => (
                      <DropdownMenuItem
                        key={def.key}
                        onClick={() => setActive(def.key)}
                      >
                        {t(def.labelKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {ActiveComponent && <ActiveComponent />}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
