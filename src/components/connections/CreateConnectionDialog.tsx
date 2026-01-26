import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/i18n";
import type { Database } from "@/integrations/supabase/types";

type ConnectionType = Database["public"]["Enums"]["connection_type"];

interface CreateConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    connectionType: ConnectionType;
    recipientEmail?: string;
    recipientPhone?: string;
  }) => void;
  isLoading?: boolean;
}

export function CreateConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateConnectionDialogProps) {
  const { t } = useI18n();
  const [connectionType, setConnectionType] = useState<ConnectionType>("b2b");
  const [recipientMethod, setRecipientMethod] = useState<"email" | "phone">("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      connectionType,
      recipientEmail: recipientMethod === "email" ? recipientEmail : undefined,
      recipientPhone: recipientMethod === "phone" ? recipientPhone : undefined,
    });
  };

  const resetForm = () => {
    setConnectionType("b2b");
    setRecipientMethod("email");
    setRecipientEmail("");
    setRecipientPhone("");
  };

  const connectionTypes: ConnectionType[] = [
    "b2b",
    "b2c",
    "employment",
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("connections.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("connections.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("connections.type")}</Label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {connectionTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`connections.types.${type}` as keyof typeof t)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("connections.recipientMethod")}</Label>
            <RadioGroup
              value={recipientMethod}
              onValueChange={(v) => setRecipientMethod(v as "email" | "phone")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email">{t("connections.viaEmail")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone">{t("connections.viaPhone")}</Label>
              </div>
            </RadioGroup>
          </div>

          {recipientMethod === "email" ? (
            <div className="space-y-2">
              <Label htmlFor="recipient-email">{t("common.email")}</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="recipient-phone">{t("common.phone")}</Label>
              <Input
                id="recipient-phone"
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+966..."
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.loading") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
