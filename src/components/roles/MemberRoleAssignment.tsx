import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Crown, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";

interface TenantRole {
  tenant_id: string;
  role_key: string;
  name: string;
  name_ar: string | null;
  is_system?: boolean;
}

interface TenantMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MemberRoleAssignmentProps {
  members: TenantMemberWithProfile[];
  roles: TenantRole[];
  onUpdateRole: (data: { memberId: string; newRole: string }) => void;
  isUpdating: boolean;
  isOwner: boolean;
}

export function MemberRoleAssignment({
  members,
  roles,
  onUpdateRole,
  isUpdating,
  isOwner,
}: MemberRoleAssignmentProps) {
  const { t, lang } = useI18n();
  const isArabic = lang === "ar";

  const getRoleDisplayName = (roleKey: string) => {
    const role = roles.find((r) => r.role_key === roleKey);
    if (!role) return roleKey;
    return isArabic && role.name_ar ? role.name_ar : role.name;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("roles.assignToMembers")}
        </CardTitle>
        <CardDescription>{t("roles.assignToMembersDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {members.map((member) => {
              const isOwnerMember = member.role === "owner";
              const displayName = member.profile?.full_name || t("common.noName");

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-background/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(member.profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{displayName}</span>
                        {isOwnerMember && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getRoleDisplayName(member.role)}
                      </Badge>
                    </div>
                  </div>

                  {isOwner && !isOwnerMember && (
                    <Select
                      value={member.role}
                      onValueChange={(newRole) =>
                        onUpdateRole({ memberId: member.id, newRole })
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Only show system roles until enum is converted to text in Patch 3 */}
                        {roles
                          .filter((r) => r.role_key !== "owner" && r.is_system !== false)
                          .map((role) => (
                            <SelectItem key={role.role_key} value={role.role_key}>
                              {isArabic && role.name_ar ? role.name_ar : role.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {isOwnerMember && (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="w-3 h-3" />
                      {t("roles.ownerCannotChange")}
                    </Badge>
                  )}

                  {!isOwner && !isOwnerMember && (
                    <Badge variant="outline">
                      {getRoleDisplayName(member.role)}
                    </Badge>
                  )}
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("roles.noMembers")}
              </p>
            )}
          </div>
        </ScrollArea>

        {!isOwner && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
            {t("roles.ownerOnlyMessage")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
