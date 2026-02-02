import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { MultiPhoneInput, type PhoneEntry } from "./MultiPhoneInput";
import type { Client, CreateClientData, ClientType, ClientStatus, PaymentMethod } from "@/hooks/useClients";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (data: CreateClientData) => Promise<Client | null>;
  initialName?: string;
}

const CLIENT_TYPES: ClientType[] = ["individual", "organization", "farm", "clinic"];
const CLIENT_STATUSES: ClientStatus[] = ["active", "inactive", "pending"];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "check"];

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
  initialName = "",
}: ClientFormDialogProps) {
  const { t, dir } = useI18n();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateClientData>({
    name: "",
    name_ar: "",
    email: "",
    phone: "",
    address: "",
    type: "individual",
    status: "active",
    tax_number: "",
    preferred_payment_method: null,
    credit_limit: null,
    notes: "",
  });

  // Multi-phone entries
  const [phones, setPhones] = useState<PhoneEntry[]>([]);

  useEffect(() => {
    if (open) {
      if (client) {
        // Parse existing phones from client data (phones jsonb field comes from DB)
        const existingPhones: PhoneEntry[] = [];
        const clientAny = client as any;
        if (clientAny.phones && Array.isArray(clientAny.phones)) {
          existingPhones.push(...(clientAny.phones as PhoneEntry[]));
        } else if (client.phone) {
          // Migrate legacy single phone to array
          existingPhones.push({
            number: client.phone,
            label: 'mobile',
            is_whatsapp: false,
            is_primary: true,
          });
        }
        
        setPhones(existingPhones);
        setFormData({
          name: client.name,
          name_ar: client.name_ar || "",
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          type: client.type,
          status: client.status,
          tax_number: client.tax_number || "",
          preferred_payment_method: client.preferred_payment_method,
          credit_limit: client.credit_limit,
          notes: client.notes || "",
        });
      } else {
        setPhones([]);
        setFormData({
          name: initialName,
          name_ar: "",
          email: "",
          phone: "",
          address: "",
          type: "individual",
          status: "active",
          tax_number: "",
          preferred_payment_method: null,
          credit_limit: null,
          notes: "",
        });
      }
    }
  }, [open, client, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      // Get primary phone for legacy field
      const primaryPhone = phones.find(p => p.is_primary)?.number || phones[0]?.number || "";
      
      // Build save data with phones array (will be stored as jsonb in DB)
      const saveData: CreateClientData & { phones?: PhoneEntry[] } = {
        ...formData,
        phone: primaryPhone,
      };
      // Add phones as extra field - hook will handle it
      (saveData as any).phones = phones;
      
      const result = await onSave(saveData as CreateClientData);
      if (result) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!client;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("clients.edit") : t("clients.create")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 p-1">
            {/* Name (English) */}
            <div className="grid gap-2">
              <Label htmlFor="name">{t("clients.form.nameEn")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter client name"
                required
                dir="ltr"
              />
            </div>

            {/* Name Arabic */}
            <div className="grid gap-2">
              <Label htmlFor="name_ar">{t("clients.form.nameAr")}</Label>
              <Input
                id="name_ar"
                value={formData.name_ar || ""}
                onChange={(e) => setFormData((p) => ({ ...p, name_ar: e.target.value }))}
                placeholder={t("clients.form.nameArPlaceholder")}
                dir="rtl"
              />
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("clients.form.type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, type: v as ClientType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`clients.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>{t("clients.form.status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((p) => ({ ...p, status: v as ClientStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`clients.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-Phone Input */}
            <MultiPhoneInput
              phones={phones}
              onChange={setPhones}
              disabled={loading}
            />

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">{t("clients.form.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address">{t("clients.form.address")}</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder={t("clients.form.addressPlaceholder")}
              />
            </div>

            {/* Tax Number */}
            <div className="grid gap-2">
              <Label htmlFor="tax_number">{t("clients.form.taxNumber")}</Label>
              <Input
                id="tax_number"
                value={formData.tax_number || ""}
                onChange={(e) => setFormData((p) => ({ ...p, tax_number: e.target.value }))}
                placeholder={t("clients.form.taxNumberPlaceholder")}
                dir="ltr"
              />
            </div>

            {/* Payment & Credit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("clients.form.paymentMethod")}</Label>
                <Select
                  value={formData.preferred_payment_method || "none"}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      preferred_payment_method: v === "none" ? null : (v as PaymentMethod),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.noPreference")}</SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(`clients.paymentMethods.${method}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="credit_limit">{t("clients.form.creditLimit")}</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  value={formData.credit_limit || ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      credit_limit: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">{t("clients.form.notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t("clients.form.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.name.trim()}>
            {loading ? t("common.loading") : isEdit ? t("common.update") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}