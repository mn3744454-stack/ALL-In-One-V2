import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, Send, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvitations } from "@/hooks/useInvitations";
import { toast } from "sonner";

type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

interface InvitePersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledEmail?: string;
}

export function InvitePersonDialog({ open, onOpenChange, prefilledEmail = "" }: InvitePersonDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { createInvitation } = useInvitations();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<TenantRole>("employee");
  const [sending, setSending] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setRole("employee");
    setMode("email");
  };

  const handleSend = async () => {
    const identifier = mode === "email" ? email.trim() : phone.trim();
    if (!identifier) {
      toast.error(mode === "email" ? t("teamPartners.invite.enterEmail") : t("teamPartners.invite.enterPhone"));
      return;
    }

    setSending(true);
    const { error } = await createInvitation({
      invitee_email: mode === "email" ? email.trim() : "",
      invitee_phone: mode === "phone" ? phone.trim() : undefined,
      proposed_role: role,
    });
    setSending(false);

    if (error) {
      toast.error(t("notifications.inviteFailed"));
    } else {
      toast.success(t("notifications.inviteSent"));
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("teamPartners.invite.title")}</DialogTitle>
          <DialogDescription>
            {t("teamPartners.invite.description")} {activeTenant?.tenant.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Email / Phone toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "email" | "phone")} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1 gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {t("teamPartners.invite.byEmail")}
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex-1 gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {t("teamPartners.invite.byPhone")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("notifications.emailAddress")}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    inputMode="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ps-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="phone" className="mt-3">
              <div className="space-y-2">
                <Label htmlFor="invite-phone">{t("teamPartners.invite.phoneNumber")}</Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+966 5X XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="ps-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Role hint */}
          <div className="space-y-2">
            <Label>{t("teamPartners.invite.roleHint")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TenantRole)}>
              <SelectTrigger>
                <SelectValue placeholder={t("notifications.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{t("notifications.roles.manager")}</SelectItem>
                <SelectItem value="foreman">{t("notifications.roles.foreman")}</SelectItem>
                <SelectItem value="vet">{t("notifications.roles.vet")}</SelectItem>
                <SelectItem value="trainer">{t("notifications.roles.trainer")}</SelectItem>
                <SelectItem value="employee">{t("notifications.roles.employee")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("teamPartners.invite.roleHintDesc")}</p>
          </div>

          <Button variant="gold" className="w-full" onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 me-2" />
            )}
            {t("notifications.sendInvitation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
