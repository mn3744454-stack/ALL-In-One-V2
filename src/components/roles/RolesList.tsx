import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Edit2, Trash2, Crown, Users } from "lucide-react";
import { useI18n } from "@/i18n";

interface TenantRole {
  tenant_id: string;
  role_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_system: boolean;
}

interface RolesListProps {
  roles: TenantRole[];
  selectedRoleKey: string | null;
  onSelectRole: (roleKey: string) => void;
  onEditRole: (role: TenantRole) => void;
  onDeleteRole: (roleKey: string) => void;
  getRolePermissionCount: (roleKey: string) => number;
  getRoleBundleCount: (roleKey: string) => number;
  getMemberCount: (roleKey: string) => number;
  isOwner: boolean;
}

export function RolesList({
  roles,
  selectedRoleKey,
  onSelectRole,
  onEditRole,
  onDeleteRole,
  getRolePermissionCount,
  getRoleBundleCount,
  getMemberCount,
  isOwner,
}: RolesListProps) {
  const { t, language } = useI18n();
  const isArabic = language === "ar";

  const roleIcons: Record<string, string> = {
    owner: "👑",
    manager: "📊",
    admin: "⚙️",
    foreman: "🔧",
    vet: "🩺",
    trainer: "🏇",
    employee: "👤",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t("roles.rolesList")}
        </CardTitle>
        <CardDescription>{t("roles.rolesListDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = selectedRoleKey === role.role_key;
              const permCount = getRolePermissionCount(role.role_key);
              const bundleCount = getRoleBundleCount(role.role_key);
              const memberCount = getMemberCount(role.role_key);
              const displayName = isArabic && role.name_ar ? role.name_ar : role.name;
              const displayDesc = isArabic && role.description_ar ? role.description_ar : role.description;

              return (
                <div
                  key={role.role_key}
                  onClick={() => onSelectRole(role.role_key)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                        {roleIcons[role.role_key] || "🔐"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{displayName}</span>
                          {role.is_system && (
                            <Badge variant="secondary" className="text-xs">
                              {t("common.system")}
                            </Badge>
                          )}
                          {role.role_key === "owner" && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        {displayDesc && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {displayDesc}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Shield className="w-3 h-3" />
                            {permCount} {t("roles.permissions")}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            {bundleCount} {t("roles.bundles")}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="w-3 h-3" />
                            {memberCount} {t("roles.members")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRole(role);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!role.is_system && memberCount === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRole(role.role_key);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("roles.noRoles")}
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
