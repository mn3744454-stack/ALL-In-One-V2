import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Users, Save, Loader2, ExternalLink, Shield, Briefcase,
  UserPlus, Monitor, FileText, Building2, UserCheck,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { useMemberRoleAssignment } from "@/hooks/roles/useMemberRoleAssignment";
import { useEmploymentKind, type EmploymentKind } from "@/hooks/hr/useEmploymentKind";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { UnifiedPerson } from "@/hooks/team/useUnifiedTeam";
import { useEffect } from "react";

type TenantRole = "manager" | "foreman" | "vet" | "trainer" | "employee";

interface PersonDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: UnifiedPerson;
  onInviteToPlatform?: (person: UnifiedPerson) => void;
}

export function PersonDetailSheet({ open, onOpenChange, person, onInviteToPlatform }: PersonDetailSheetProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { horses } = useHorses();
  const { updateMemberRole } = useMemberRoleAssignment();
  const { updateEmploymentKind, isUpdating: isUpdatingKind } = useEmploymentKind();
  const { activeTenant } = useTenant();

  const [role, setRole] = useState<TenantRole>((person.role as TenantRole) || "employee");
  const [selectedHorses, setSelectedHorses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [employmentKind, setEmploymentKind] = useState<EmploymentKind>(person.employmentKind || "external");

  // Load current horse access
  useEffect(() => {
    if (!open || !person.memberId) return;
    const loadAccess = async () => {
      setLoadingAccess(true);
      const { data } = await supabase
        .from("member_horse_access")
        .select("horse_id")
        .eq("tenant_member_id", person.memberId!);
      if (data) setSelectedHorses(data.map(d => d.horse_id));
      setLoadingAccess(false);
    };
    loadAccess();
  }, [open, person.memberId]);

  useEffect(() => {
    setRole((person.role as TenantRole) || "employee");
    setEmploymentKind(person.employmentKind || "external");
  }, [person.role, person.employmentKind]);

  const handleSave = async () => {
    if (!person.memberId) return;
    setSaving(true);

    if (role !== person.role) {
      updateMemberRole({ memberId: person.memberId, newRole: role });
    }

    try {
      await supabase.from("member_horse_access").delete().eq("tenant_member_id", person.memberId);
      if (selectedHorses.length > 0) {
        await supabase.from("member_horse_access").insert(
          selectedHorses.map(horseId => ({ tenant_member_id: person.memberId!, horse_id: horseId }))
        );
      }
      toast.success(t("teamPartners.setup.saved"));
    } catch {
      toast.error(t("teamPartners.setup.saveFailed"));
    }
    setSaving(false);
    onOpenChange(false);
  };

  const handleEmploymentKindChange = async (newKind: EmploymentKind) => {
    if (!person.hrEmployeeId || newKind === employmentKind) return;
    try {
      await updateEmploymentKind({
        employeeId: person.hrEmployeeId,
        employmentKind: newKind,
        previousKind: employmentKind,
      });
      setEmploymentKind(newKind);
    } catch {
      // Error toast handled by the hook
    }
  };

  const toggleHorse = (horseId: string) => {
    setSelectedHorses(prev =>
      prev.includes(horseId) ? prev.filter(id => id !== horseId) : [...prev, horseId]
    );
  };

  const statusBadge = () => {
    if (person.status === "pending") return <Badge variant="outline">{t("teamPartners.personStatus.pending")}</Badge>;
    if (person.status === "hr_only") return <Badge variant="secondary">{t("teamPartners.personStatus.hrOnly")}</Badge>;
    return <Badge variant="default">{t("teamPartners.personStatus.active")}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[95vw] sm:w-[440px]">
        <SheetHeader>
          <SheetTitle>{t("teamPartners.personDetail.title")}</SheetTitle>
          <SheetDescription>{t("teamPartners.personDetail.description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-140px)] pe-2">
          <div className="space-y-5">
            {/* Person info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{person.fullName || t("teamPartners.unnamed")}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {statusBadge()}
                  {employmentKind && (
                    <Badge variant="outline" className="text-[10px]">
                      {employmentKind === "internal"
                        ? t("teamPartners.classification.internal")
                        : t("teamPartners.classification.external")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("teamPartners.personDetail.platformAccess")}</p>
                  <p className="text-xs font-medium">
                    {person.hasPlatformAccess ? t("common.yes") : t("common.no")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t("teamPartners.personDetail.hrRecord")}</p>
                  <p className="text-xs font-medium">
                    {person.hasHrRecord ? t("common.yes") : t("common.no")}
                  </p>
                </div>
              </div>
            </div>

            {/* Invite to Platform action for HR-only people */}
            {!person.hasPlatformAccess && onInviteToPlatform && (
              <Button
                variant="gold"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  onInviteToPlatform(person);
                  onOpenChange(false);
                }}
              >
                <UserPlus className="w-4 h-4" />
                {t("teamPartners.personDetail.inviteToPlatform")}
              </Button>
            )}

            {/* Employment classification - for people with HR records */}
            {person.hasHrRecord && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {t("teamPartners.personDetail.employmentClassification")}
                  </Label>
                  <Select
                    value={employmentKind}
                    onValueChange={(v) => handleEmploymentKindChange(v as EmploymentKind)}
                    disabled={isUpdatingKind}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          {t("teamPartners.classification.internal")}
                        </span>
                      </SelectItem>
                      <SelectItem value="external">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {t("teamPartners.classification.external")}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("teamPartners.personDetail.classificationHint")}
                  </p>
                </div>
              </>
            )}

            {/* Role section - only for platform members */}
            {person.hasPlatformAccess && person.role !== "owner" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {t("teamPartners.setup.confirmRole")}
                  </Label>
                  <Select value={role} onValueChange={(v) => setRole(v as TenantRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{t("notifications.roles.manager")}</SelectItem>
                      <SelectItem value="foreman">{t("notifications.roles.foreman")}</SelectItem>
                      <SelectItem value="vet">{t("notifications.roles.vet")}</SelectItem>
                      <SelectItem value="trainer">{t("notifications.roles.trainer")}</SelectItem>
                      <SelectItem value="employee">{t("notifications.roles.employee")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Horse assignment - only for platform members */}
            {person.hasPlatformAccess && person.role !== "owner" && (
              <div className="space-y-2">
                <Label>{t("teamPartners.setup.assignHorses")}</Label>
                {loadingAccess ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : horses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{t("teamPartners.setup.noHorses")}</p>
                ) : (
                  <ScrollArea className="max-h-[160px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {horses.map((horse) => (
                        <div key={horse.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`detail-horse-${horse.id}`}
                            checked={selectedHorses.includes(horse.id)}
                            onCheckedChange={() => toggleHorse(horse.id)}
                          />
                          <label htmlFor={`detail-horse-${horse.id}`} className="text-sm cursor-pointer flex-1">
                            {horse.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* HR Link */}
            {person.hasHrRecord && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {t("teamPartners.setup.hrRecord")}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/dashboard/hr");
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("teamPartners.setup.viewInHR")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("teamPartners.setup.hrHint")}</p>
              </div>
            )}

            {/* Save button - only for configurable members */}
            {person.hasPlatformAccess && person.role !== "owner" && (
              <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                {t("teamPartners.setup.save")}
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
