import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";

export interface WalkInClientData {
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string;
}

interface WalkInClientFormProps {
  data: WalkInClientData;
  onChange: (data: WalkInClientData) => void;
}

export function WalkInClientForm({ data, onChange }: WalkInClientFormProps) {
  const { t } = useI18n();

  const handleChange = (field: keyof WalkInClientData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client_name">
          {t("laboratory.walkInClient.name")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="client_name"
          value={data.client_name}
          onChange={(e) => handleChange("client_name", e.target.value)}
          placeholder={t("laboratory.walkInClient.namePlaceholder")}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_phone">{t("laboratory.walkInClient.phone")}</Label>
        <Input
          id="client_phone"
          type="tel"
          dir="ltr"
          value={data.client_phone}
          onChange={(e) => handleChange("client_phone", e.target.value)}
          placeholder={t("laboratory.walkInClient.phonePlaceholder")}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_email">{t("laboratory.walkInClient.email")}</Label>
        <Input
          id="client_email"
          type="email"
          dir="ltr"
          value={data.client_email}
          onChange={(e) => handleChange("client_email", e.target.value)}
          placeholder={t("laboratory.walkInClient.emailPlaceholder")}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_notes">{t("laboratory.walkInClient.notes")}</Label>
        <Textarea
          id="client_notes"
          value={data.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder={t("laboratory.walkInClient.notesPlaceholder")}
          rows={2}
        />
      </div>
    </Card>
  );
}
