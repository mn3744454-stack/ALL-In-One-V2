import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Phone, MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface PhoneEntry {
  number: string;
  label: 'mobile' | 'work' | 'home' | 'other';
  is_whatsapp: boolean;
  is_primary: boolean;
}

interface MultiPhoneInputProps {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
  disabled?: boolean;
}

const PHONE_LABELS = ['mobile', 'work', 'home', 'other'] as const;

export function MultiPhoneInput({
  phones,
  onChange,
  disabled = false,
}: MultiPhoneInputProps) {
  const { t } = useI18n();

  const handleAddPhone = () => {
    const newPhone: PhoneEntry = {
      number: "",
      label: "mobile",
      is_whatsapp: false,
      is_primary: phones.length === 0, // First phone is primary
    };
    onChange([...phones, newPhone]);
  };

  const handleRemovePhone = (index: number) => {
    const updated = phones.filter((_, i) => i !== index);
    // If removed phone was primary, make first remaining one primary
    if (phones[index]?.is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }
    onChange(updated);
  };

  const handleUpdatePhone = (index: number, updates: Partial<PhoneEntry>) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], ...updates };
    
    // If setting this as primary, remove primary from others
    if (updates.is_primary) {
      updated.forEach((phone, i) => {
        if (i !== index) phone.is_primary = false;
      });
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("clients.form.phones")}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddPhone}
          disabled={disabled}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 me-1" />
          {t("clients.form.addPhone")}
        </Button>
      </div>

      {phones.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          {t("clients.form.noPhonesAdded")}
        </div>
      ) : (
        <div className="space-y-2">
          {phones.map((phone, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-muted/20",
                phone.is_primary && "border-primary/30 bg-primary/5"
              )}
            >
              {/* Phone Number */}
              <div className="flex-1 min-w-[140px]">
                <Input
                  value={phone.number}
                  onChange={(e) => handleUpdatePhone(index, { number: e.target.value })}
                  placeholder="+966 5XX XXX XXXX"
                  disabled={disabled}
                  dir="ltr"
                  className="h-9"
                />
              </div>

              {/* Label Select */}
              <Select
                value={phone.label}
                onValueChange={(value: PhoneEntry['label']) => handleUpdatePhone(index, { label: value })}
                disabled={disabled}
              >
                <SelectTrigger className="w-[100px] h-9">
                  <Phone className="h-3 w-3 me-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_LABELS.map((label) => (
                    <SelectItem key={label} value={label}>
                      {t(`clients.phoneLabels.${label}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* WhatsApp Toggle */}
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`whatsapp-${index}`}
                  checked={phone.is_whatsapp}
                  onCheckedChange={(checked) => handleUpdatePhone(index, { is_whatsapp: !!checked })}
                  disabled={disabled}
                />
                <label
                  htmlFor={`whatsapp-${index}`}
                  className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                >
                  <MessageCircle className="h-3 w-3" />
                  {t("clients.form.whatsapp")}
                </label>
              </div>

              {/* Primary Badge/Button */}
              {phone.is_primary ? (
                <Badge variant="default" className="text-xs h-6">
                  {t("clients.form.primaryPhone")}
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdatePhone(index, { is_primary: true })}
                  disabled={disabled}
                  className="h-6 text-xs px-2"
                >
                  {t("clients.form.setAsPrimary")}
                </Button>
              )}

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePhone(index)}
                disabled={disabled}
                className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
