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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { CURRENCY_OPTIONS } from "@/lib/currencyOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Info, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { HrEmployeeType } from "@/hooks/hr/useEmployees";

const EMPLOYEE_TYPES: HrEmployeeType[] = [
  "trainer",
  "groom",
  "vet_tech",
  "receptionist",
  "lab_tech",
  "admin",
  "manager",
  "driver",
  "farrier",
  "other",
];

export interface QuickCreatedEmployee {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  employee_type: HrEmployeeType;
  employment_kind: "internal" | "external";
}

interface QuickCreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (employee: QuickCreatedEmployee) => void;
}

/**
 * Phase 1 quick-create employee bridge for payroll workflow continuity.
 * Locked field set: Name EN (required), Name AR (optional), employee type,
 * salary (optional), single phone (optional). employment_kind locked to "internal".
 */
export function QuickCreateEmployeeDialog({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateEmployeeDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantCurrency = useTenantCurrency();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    full_name_ar: "",
    employee_type: "other" as HrEmployeeType,
    salary_amount: "",
    salary_currency: tenantCurrency,
    phone: "",
  });

  const tenantId = activeTenant?.tenant?.id;
  const canSubmit = form.full_name.trim().length > 0;

  const reset = () => {
    setForm({
      full_name: "",
      full_name_ar: "",
      employee_type: "other",
      salary_amount: "",
      salary_currency: tenantCurrency,
      phone: "",
    });
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !tenantId || !user?.id) return;
    setSaving(true);
    try {
      const salaryNumber = form.salary_amount ? parseFloat(form.salary_amount) : null;
      const { data, error } = await supabase
        .from("hr_employees")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          full_name: form.full_name.trim(),
          full_name_ar: form.full_name_ar.trim() || null,
          employee_type: form.employee_type,
          employment_kind: "internal",
          phone: form.phone.trim() || null,
          salary_amount: salaryNumber,
          salary_currency: salaryNumber ? form.salary_currency : null,
        } as any)
        .select("id, full_name, full_name_ar, employee_type, employment_kind")
        .single();

      if (error) throw error;

      // Refresh employee lists across the app
      queryClient.invalidateQueries({ queryKey: ["hr-employees", tenantId] });

      toast.success(t("hr.employeeCreated"));
      reset();
      onOpenChange(false);
      onCreated(data as QuickCreatedEmployee);
    } catch (err: any) {
      console.error("Quick-create employee failed:", err);
      toast.error(err?.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t("hr.quickCreate.title")}
          </DialogTitle>
          <DialogDescription>{t("hr.quickCreate.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 space-y-5 py-2">
          {/* Names row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qc-emp-name">{t("hr.fullName")} *</Label>
              <Input
                id="qc-emp-name"
                dir="ltr"
                placeholder={t("hr.fullNamePlaceholder")}
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-emp-name-ar">{t("hr.fullNameAr")}</Label>
              <Input
                id="qc-emp-name-ar"
                dir="rtl"
                placeholder={t("hr.fullNameArPlaceholder")}
                value={form.full_name_ar}
                onChange={(e) => setForm((f) => ({ ...f, full_name_ar: e.target.value }))}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>{t("hr.employeeType")} *</Label>
            <Select
              value={form.employee_type}
              onValueChange={(v) => setForm((f) => ({ ...f, employee_type: v as HrEmployeeType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`hr.employeeTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary + currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="qc-emp-salary">{t("hr.quickCreate.salary")}</Label>
              <Input
                id="qc-emp-salary"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                dir="ltr"
                placeholder="0.00"
                value={form.salary_amount}
                onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("hr.payroll.currency")}</Label>
              <Select
                value={form.salary_currency}
                onValueChange={(v) => setForm((f) => ({ ...f, salary_currency: v }))}
              >
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
          </div>

          {/* Single phone */}
          <div className="space-y-2">
            <Label htmlFor="qc-emp-phone">{t("hr.phone")}</Label>
            <Input
              id="qc-emp-phone"
              type="tel"
              dir="ltr"
              placeholder={t("hr.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          {/* Amber hint — completion later */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              {t("hr.quickCreate.completeHint")}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
