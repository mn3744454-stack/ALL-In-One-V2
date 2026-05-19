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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { useI18n } from "@/i18n";
import { useBoardingAdmissions } from "@/hooks/housing/useBoardingAdmissions";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import { formatBilingualName } from "@/lib/displayHelpers";

interface SetBoardingPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
  currentDailyRate: number | null;
  currentMonthlyRate: number | null;
  currentCurrency: string | null;
  horseName?: string | null;
  horseNameAr?: string | null;
}

export function SetBoardingPriceDialog({
  open,
  onOpenChange,
  admissionId,
  currentDailyRate,
  currentMonthlyRate,
  currentCurrency,
  horseName,
  horseNameAr,
}: SetBoardingPriceDialogProps) {
  const { t, lang } = useI18n();
  const { updateAdmission } = useBoardingAdmissions();
  const tenantCurrency = useTenantCurrency();

  const [daily, setDaily] = useState<string>("");
  const [monthly, setMonthly] = useState<string>("");
  const [currency, setCurrency] = useState<string>(tenantCurrency);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDaily(currentDailyRate != null ? String(currentDailyRate) : "");
      setMonthly(currentMonthlyRate != null ? String(currentMonthlyRate) : "");
      setCurrency(currentCurrency || tenantCurrency);
    }
  }, [open, currentDailyRate, currentMonthlyRate, currentCurrency, tenantCurrency]);

  const bilingualHorse = formatBilingualName(horseName, horseNameAr, lang);
  const dialogTitle = t("housing.admissions.detail.setPriceDialogTitle").replace(
    "{{name}}",
    bilingualHorse
  );

  const dailyNum = daily.trim() === "" ? null : parseFloat(daily);
  const monthlyNum = monthly.trim() === "" ? null : parseFloat(monthly);
  const hasAtLeastOne =
    (dailyNum != null && !isNaN(dailyNum) && dailyNum >= 0) ||
    (monthlyNum != null && !isNaN(monthlyNum) && monthlyNum >= 0);

  const handleSave = async () => {
    if (!hasAtLeastOne) return;
    setSaving(true);
    try {
      await updateAdmission({
        admissionId,
        daily_rate: dailyNum != null && !isNaN(dailyNum) ? dailyNum : null,
        monthly_rate: monthlyNum != null && !isNaN(monthlyNum) ? monthlyNum : null,
        rate_currency: currency,
      } as any);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="daily-rate">
                {t("housing.admissions.wizard.dailyRate")}
              </Label>
              <Input
                id="daily-rate"
                type="number"
                min="0"
                inputMode="decimal"
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthly-rate">
                {t("housing.admissions.wizard.monthlyRate")}
              </Label>
              <Input
                id="monthly-rate"
                type="number"
                min="0"
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("housing.admissions.wizard.currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
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
          </div>

          <p className="text-xs text-muted-foreground">
            {t("housing.admissions.detail.setPriceHelp")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasAtLeastOne}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
