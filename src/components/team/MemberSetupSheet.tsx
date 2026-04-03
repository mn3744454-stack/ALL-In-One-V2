import { useState, useEffect } from "react";
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
import { Users, Save, Loader2, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n";
import { useHorses } from "@/hooks/useHorses";
import { useMemberRoleAssignment, type TenantMemberWithProfile } from "@/hooks/roles/useMemberRoleAssignment";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type TenantRole = "manager" | "foreman" | "vet" | "trainer" | "employee";

interface MemberSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TenantMemberWithProfile;
}

export function MemberSetupSheet({ open, onOpenChange, member }: MemberSetupSheetProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { horses } = useHorses();
  const { updateMemberRole } = useMemberRoleAssignment();
  const { activeTenant } = useTenant();

  const [role, setRole] = useState<TenantRole>(member.role as TenantRole);
  const [selectedHorses, setSelectedHorses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(false);

  // Load current horse access
  useEffect(() => {
    if (!open || !member.user_id || !activeTenant?.tenant_id) return;
    
    const loadAccess = async () => {
      setLoadingAccess(true);
      const { data } = await supabase
        .from("member_horse_access")
        .select("horse_id")
        .eq("member_id", member.id);
      
      if (data) {
        setSelectedHorses(data.map(d => d.horse_id));
      }
      setLoadingAccess(false);
    };
    loadAccess();
  }, [open, member.id, member.user_id, activeTenant?.tenant_id]);

  const handleSave = async () => {
    setSaving(true);

    // Update role if changed
    if (role !== member.role) {
      updateMemberRole({ memberId: member.id, newRole: role });
    }

    // Update horse access
    try {
    // Clear existing access
      await supabase
        .from("member_horse_access")
        .delete()
        .eq("tenant_member_id", member.id);

      // Insert new access
      if (selectedHorses.length > 0) {
        const rows = selectedHorses.map(horseId => ({
          tenant_member_id: member.id,
          horse_id: horseId,
        }));
        await supabase
          .from("member_horse_access")
          .insert(rows);
      }

      toast.success(t("teamPartners.setup.saved"));
    } catch (error) {
      console.error("Error saving horse access:", error);
      toast.error(t("teamPartners.setup.saveFailed"));
    }

    setSaving(false);
    onOpenChange(false);
  };

  const toggleHorse = (horseId: string) => {
    setSelectedHorses(prev =>
      prev.includes(horseId)
        ? prev.filter(id => id !== horseId)
        : [...prev, horseId]
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[95vw] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>{t("teamPartners.setup.title")}</SheetTitle>
          <SheetDescription>{t("teamPartners.setup.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Member info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{member.profile?.full_name || t("teamPartners.unnamed")}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">
                {t(`notifications.roles.${member.role}`) || member.role}
              </Badge>
            </div>
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <Label>{t("teamPartners.setup.confirmRole")}</Label>
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

          {/* Horse assignment */}
          <div className="space-y-2">
            <Label>{t("teamPartners.setup.assignHorses")}</Label>
            {loadingAccess ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : horses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t("teamPartners.setup.noHorses")}</p>
            ) : (
              <ScrollArea className="max-h-[200px] border rounded-lg p-2">
                <div className="space-y-2">
                  {horses.map((horse) => (
                    <div key={horse.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`setup-horse-${horse.id}`}
                        checked={selectedHorses.includes(horse.id)}
                        onCheckedChange={() => toggleHorse(horse.id)}
                      />
                      <label htmlFor={`setup-horse-${horse.id}`} className="text-sm cursor-pointer flex-1">
                        {horse.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* HR link */}
          <div className="space-y-2">
            <Label>{t("teamPartners.setup.hrRecord")}</Label>
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

          {/* Save */}
          <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 me-2" />
            )}
            {t("teamPartners.setup.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
