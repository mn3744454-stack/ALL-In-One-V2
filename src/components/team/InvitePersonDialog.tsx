import { useEffect, useMemo, useState } from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
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

  const [form, setForm] = useState({
    mode: "email" as "email" | "phone",
    email: prefilledEmail,
    phone: "",
    role: "employee" as TenantRole,
  });
  const [sending, setSending] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Re-seed when reopening with a new prefilledEmail.
  useEffect(() => {
    if (open) {
      setForm({
        mode: "email",
        email: prefilledEmail,
        phone: "",
        role: "employee",
      });
      setAttemptedSubmit(false);
    }
  }, [open, prefilledEmail]);

  // Snapshot includes active tab so switching while drafting is intentional.
  const { isDirty, resetBaseline } = useDirtyForm(form, open);

  const emailValid = form.email.trim().length > 0;
  const phoneValid = form.phone.trim().length > 0;
  const identifierValid = form.mode === "email" ? emailValid : phoneValid;

  const missingIssues = useMemo<string[]>(() => {
    const out: string[] = [];
    if (form.mode === "email" && !emailValid) out.push(t("teamPartners.invite.missing.email"));
    if (form.mode === "phone" && !phoneValid) out.push(t("teamPartners.invite.missing.phone"));
    return out;
  }, [form.mode, emailValid, phoneValid, t]);

  const effectiveIsDirty = isDirty && !sending;

  const handleSend = async () => {
    setAttemptedSubmit(true);
    if (!identifierValid) return;

    setSending(true);
    const { error } = await createInvitation({
      invitee_email: form.mode === "email" ? form.email.trim() : "",
      invitee_phone: form.mode === "phone" ? form.phone.trim() : undefined,
      proposed_role: form.role,
    });
    setSending(false);

    if (error) {
      toast.error(t("notifications.inviteFailed"));
    } else {
      toast.success(t("notifications.inviteSent"));
      resetBaseline(form);
      onOpenChange(false);
    }
  };

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={effectiveIsDirty}
      className="sm:max-w-[420px]"
    >
      <DialogHeader>
        <DialogTitle>{t("teamPartners.invite.title")}</DialogTitle>
        <DialogDescription>
          {t("teamPartners.invite.description")} {activeTenant?.tenant.name}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        <Tabs
          value={form.mode}
          onValueChange={(v) => setForm((f) => ({ ...f, mode: v as "email" | "phone" }))}
          className="w-full"
        >
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
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="ps-10"
                  dir="ltr"
                  aria-invalid={attemptedSubmit && form.mode === "email" && !emailValid}
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
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="ps-10"
                  dir="ltr"
                  aria-invalid={attemptedSubmit && form.mode === "phone" && !phoneValid}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>{t("teamPartners.invite.roleHint")}</Label>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as TenantRole }))}>
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

        <MissingRequirementsBar
          issues={attemptedSubmit ? missingIssues : []}
          attempted={attemptedSubmit}
        />

        <Button variant="gold" className="w-full" onClick={handleSend} disabled={sending}>
          {sending ? (
            <Loader2 className="w-4 h-4 me-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 me-2" />
          )}
          {t("notifications.sendInvitation")}
        </Button>
      </div>
    </SafeFormDialog>
  );
}
