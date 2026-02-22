import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceModeToggle() {
  const { t, dir } = useI18n();
  const { workspaceMode, setWorkspaceMode, activeTenant, tenants } = useTenant();

  // Don't show toggle if user has no tenants
  if (tenants.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary" className="text-xs">
          {t("workspace.personal")}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg" dir={dir}>
      <Button
        variant={workspaceMode === "personal" ? "default" : "ghost"}
        size="sm"
        onClick={() => setWorkspaceMode("personal")}
        className={cn(
          "h-8 px-3 text-xs gap-1.5 transition-all",
          workspaceMode === "personal"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-background/50"
        )}
      >
        <User className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("workspace.personal")}</span>
      </Button>
      <Button
        variant={workspaceMode === "organization" ? "default" : "ghost"}
        size="sm"
        onClick={() => setWorkspaceMode("organization")}
        className={cn(
          "h-8 px-3 text-xs gap-1.5 transition-all",
          workspaceMode === "organization"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-background/50"
        )}
      >
        <Building2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline truncate max-w-[80px]">
          {workspaceMode === "organization" && activeTenant
            ? activeTenant.tenant.name
            : t("workspace.organization")}
        </span>
      </Button>
    </div>
  );
}
