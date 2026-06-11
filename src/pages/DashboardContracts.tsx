import { useMemo } from "react";
import { useSearchParams, NavLink, useNavigate, useLocation } from "react-router-dom";
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
import { ChevronDown, Plus, Briefcase, FileText, BookOpen } from "lucide-react";
import {
  getVisibleContractTypes,
  resolveActiveContractType,
  MAX_PRIMARY_TABS,
} from "@/contracts/registry";
import { ContractDocumentsSection } from "@/contracts/sections/ContractDocumentsSection";
import { ContractTemplatesSection } from "@/contracts/sections/ContractTemplatesSection";

type HubSection = "operational" | "documents" | "templates";

export default function DashboardContracts() {
  const { t } = useI18n();
  const tenantCtx = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
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

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const section: HubSection =
    normalizedPath === "/dashboard/contracts/documents"
      ? "documents"
      : normalizedPath === "/dashboard/contracts/templates"
      ? "templates"
      : "operational";

  const onPickOperational = () => {
    const next = new URLSearchParams(searchParams);
    if (active) next.set("type", active.key);
    next.set("create", "operational");
    setSearchParams(next, { replace: true });
  };
  const onPickDocument = () => {
    navigate("/dashboard/contracts/documents?create=blank");
  };
  const onPickFromForm = () => {
    navigate("/dashboard/contracts/documents?create=fromForm");
  };

  const subNavItems = [
    {
      to: "/dashboard/contracts",
      label: t("contracts.hub.operational"),
      icon: Briefcase,
      match: () => section === "operational",
    },
    {
      to: "/dashboard/contracts/documents",
      label: t("contracts.hub.documents"),
      icon: FileText,
      match: () => section === "documents",
    },
    {
      to: "/dashboard/contracts/templates",
      label: t("contracts.hub.forms"),
      icon: BookOpen,
      match: () => section === "templates",
    },
  ];

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t("contracts.cta.newContract")}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem
                onClick={onPickOperational}
                className="flex-col items-start gap-1 py-2"
              >
                <span className="font-medium">{t("contracts.cta.operationalContract")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("contracts.cta.operationalContractDesc")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onPickDocument}
                className="flex-col items-start gap-1 py-2"
              >
                <span className="font-medium">{t("contracts.cta.contractDocument")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("contracts.cta.contractDocumentDesc")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onPickFromForm}
                className="flex-col items-start gap-1 py-2"
              >
                <span className="font-medium">{t("contracts.cta.fromContractForm")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("contracts.cta.fromContractFormDesc")}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hub sub-nav */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {subNavItems.map((item) => {
            const isActive = item.match();
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard/contracts"}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("contracts.noTypes")}</p>
        ) : (
          <>
            {/* Operational contract type tabs (only render if more than one type) */}
            {primary.length > 1 && (
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
            )}

            {ActiveComponent && <ActiveComponent />}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
