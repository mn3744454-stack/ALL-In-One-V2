import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

const CURRENCY_OPTIONS = [
  { value: "SAR", label: "SAR – Saudi Riyal" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "QAR", label: "QAR – Qatari Riyal" },
  { value: "KWD", label: "KWD – Kuwaiti Dinar" },
  { value: "BHD", label: "BHD – Bahraini Dinar" },
  { value: "OMR", label: "OMR – Omani Rial" },
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
];

interface TaxPricingCardProps {
  canManage: boolean;
}

export const TaxPricingCard = ({ canManage }: TaxPricingCardProps) => {
  const { activeTenant, refreshTenants } = useTenant();
  const { t } = useI18n();

  const tenant = activeTenant?.tenant;
  const [currency, setCurrency] = useState("SAR");
  const [taxRate, setTaxRate] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Hydrate from tenant
  useEffect(() => {
    if (!tenant) return;
    setCurrency(tenant.currency || "SAR");
    setTaxRate(String(tenant.default_tax_rate ?? 15));
    setInclusive(tenant.prices_tax_inclusive ?? false);
    setDirty(false);
  }, [tenant]);

  const handleTaxRateChange = (val: string) => {
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setTaxRate(val);
      setDirty(true);
    }
  };

  const handleInclusiveChange = (value: string) => {
    setInclusive(value === "inclusive");
    setDirty(true);
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!tenant) return;

    const rate = taxRate === "" ? 0 : parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          currency,
          default_tax_rate: rate,
          prices_tax_inclusive: inclusive,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success(t("organizationSettings.taxPricing.savedSuccess"));
      setDirty(false);
      await refreshTenants();
    } catch {
      toast.error(t("organizationSettings.taxPricing.savedError"));
    } finally {
      setSaving(false);
    }
  };

  const rateNum = taxRate === "" ? 0 : parseFloat(taxRate);
  const isValid = !isNaN(rateNum) && rateNum >= 0 && rateNum <= 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t("organizationSettings.taxPricing.title")}</CardTitle>
            <CardDescription>
              {t("organizationSettings.taxPricing.description")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">{t("organizationSettings.taxPricing.currency")}</Label>
          <Select
            value={currency}
            onValueChange={handleCurrencyChange}
            disabled={!canManage || saving}
          >
            <SelectTrigger className="max-w-[280px]" id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t("organizationSettings.taxPricing.currencyHint")}
          </p>
        </div>

        {/* Tax Rate */}
        <div className="space-y-2">
          <Label htmlFor="tax-rate">{t("organizationSettings.taxPricing.taxRate")}</Label>
          <Input
            id="tax-rate"
            type="text"
            inputMode="decimal"
            value={taxRate}
            onChange={(e) => handleTaxRateChange(e.target.value)}
            disabled={!canManage || saving}
            className="max-w-[200px]"
            placeholder="15"
          />
          <p className="text-sm text-muted-foreground">
            {t("organizationSettings.taxPricing.taxRateHint")}
          </p>
        </div>

        {/* Pricing Mode */}
        <div className="space-y-2">
          <Label>{t("organizationSettings.taxPricing.pricingMode")}</Label>
          <RadioGroup
            value={inclusive ? "inclusive" : "exclusive"}
            onValueChange={handleInclusiveChange}
            disabled={!canManage || saving}
            className="space-y-3"
          >
            <div
              className="flex items-center space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => canManage && !saving && handleInclusiveChange("exclusive")}
            >
              <RadioGroupItem value="exclusive" id="tax-exclusive" />
              <Label htmlFor="tax-exclusive" className="flex-1 cursor-pointer">
                {t("organizationSettings.taxPricing.exclusive")}
              </Label>
            </div>
            <div
              className="flex items-center space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => canManage && !saving && handleInclusiveChange("inclusive")}
            >
              <RadioGroupItem value="inclusive" id="tax-inclusive" />
              <Label htmlFor="tax-inclusive" className="flex-1 cursor-pointer">
                {t("organizationSettings.taxPricing.inclusive")}
              </Label>
            </div>
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            {t("organizationSettings.taxPricing.pricingModeHint")}
          </p>
        </div>

        {/* Save button */}
        {canManage && (
          <Button
            onClick={handleSave}
            disabled={!dirty || saving || !isValid}
          >
            {saving
              ? t("organizationSettings.taxPricing.saving")
              : t("organizationSettings.taxPricing.save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
