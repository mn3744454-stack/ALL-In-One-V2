import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useTenant } from "@/contexts/TenantContext";
import { useExpenses, EXPENSE_CATEGORIES, type CreateExpenseInput } from "@/hooks/finance/useExpenses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExpenseFormDialog({ open, onOpenChange, onSuccess }: ExpenseFormDialogProps) {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { createExpense, isCreating } = useExpenses(activeTenant?.tenant.id);

  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    vendor_name: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast.error(t("finance.expenses.invalidFileType"));
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("finance.expenses.fileTooLarge"));
        return;
      }
      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (expenseId: string): Promise<string | null> => {
    if (!receiptFile || !activeTenant?.tenant.id) return null;

    try {
      setUploading(true);
      const ext = receiptFile.name.split(".").pop();
      const path = `${activeTenant.tenant.id}/expenses/${expenseId}/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("horse-media")
        .upload(path, receiptFile);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: user } = await supabase.auth.getUser();

      // Create media_asset record
      const { data: asset, error: assetError } = await supabase
        .from("media_assets" as any)
        .insert({
          tenant_id: activeTenant.tenant.id,
          entity_type: "expense",
          entity_id: expenseId,
          bucket: "horse-media",
          path,
          filename: receiptFile.name,
          mime_type: receiptFile.type,
          size_bytes: receiptFile.size,
          visibility: "tenant",
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (assetError) throw assetError;

      return (asset as any).id;
    } catch (error) {
      console.error("Receipt upload error:", error);
      toast.error(t("finance.expenses.uploadFailed"));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.tenant.id) return;

    try {
      // Validate required fields
      if (!formData.category || !formData.amount) {
        toast.error(t("common.required"));
        return;
      }

      const input: CreateExpenseInput = {
        tenant_id: activeTenant.tenant.id,
        category: formData.category,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        vendor_name: formData.vendor_name || undefined,
        notes: formData.notes || undefined,
        status: "pending",
      };

      const expense = await createExpense(input);

      // Upload receipt if provided
      if (receiptFile && expense) {
        const assetId = await uploadReceipt(expense.id);
        if (assetId) {
          // Update expense with receipt asset ID
          await supabase
            .from("expenses" as any)
            .update({ receipt_asset_id: assetId })
            .eq("id", expense.id);
        }
      }

      // Reset form
      setFormData({
        category: "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        vendor_name: "",
        notes: "",
      });
      setReceiptFile(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create expense:", error);
    }
  };

  const isLoading = isCreating || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("finance.expenses.create")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>{t("finance.expenses.category")} *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("finance.expenses.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`finance.expenses.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("finance.expenses.description")}</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("finance.expenses.descriptionPlaceholder")}
            />
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("finance.expenses.amount")} *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finance.expenses.date")}</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              />
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label>{t("finance.expenses.vendor")}</Label>
            <Input
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder={t("finance.expenses.vendorPlaceholder")}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>{t("finance.expenses.receipt")}</Label>
            {receiptFile ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="flex-1 truncate text-sm">{receiptFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setReceiptFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-gold transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {t("finance.expenses.uploadReceipt")}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, PDF (max 10MB)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("finance.expenses.notes")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("finance.expenses.notesPlaceholder")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
