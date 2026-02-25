import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Plus, Check, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tenantTypeLabels: Record<string, string> = {
  stable: "Stable",
  clinic: "Clinic",
  lab: "Laboratory",
  academy: "Academy",
  pharmacy: "Pharmacy",
  transport: "Transport",
  auction: "Auction",
  horse_owner: "Horse Owner",
  trainer: "Trainer",
  doctor: "Doctor",
};

export const TenantSwitcher = () => {
  const { tenants, activeTenant, setActiveTenant, tenantError, retryTenantFetch, loading } = useTenant();
  const navigate = useNavigate();

  // Show error state if there's an error loading tenants
  if (tenantError && tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium text-destructive">Load Error</span>
          <button 
            onClick={retryTenantFetch}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium text-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium text-foreground">Personal Account</span>
          <span className="text-xs text-muted-foreground">No organization yet</span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1 sm:gap-2 max-w-[160px] sm:max-w-[200px] px-2 sm:px-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
          </div>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-[120px]">
              {activeTenant?.tenant.name || "Select"}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {activeTenant ? tenantTypeLabels[activeTenant.tenant.type] : "Organization"}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => setActiveTenant(membership.tenant_id)}
            className="gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-gold" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {membership.tenant.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {tenantTypeLabels[membership.tenant.type]} • {membership.role}
              </span>
            </div>
            {activeTenant?.tenant_id === membership.tenant_id && (
              <Check className="w-4 h-4 text-gold shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/select-role")}
          className="gap-2 cursor-pointer text-gold"
        >
          <Plus className="w-4 h-4" />
          Add Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
