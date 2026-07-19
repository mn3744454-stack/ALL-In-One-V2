/**
 * Label 1 — Tenant-aware Quick Add horse dialog for Create Invoice.
 *
 * Lab issuer: creates a `lab_horses` row scoped to the issuer tenant and
 * links it to the selected customer via `party_horse_links` so the horse
 * immediately becomes selectable on invoice lines.
 * Stable/general issuer: creates a `public.horses` row scoped to the
 * issuer tenant. Boarding admission linkage is out of scope for the
 * invoice quick-add; the horse is still selectable via the resolver's
 * fallback code path once an admission is created elsewhere.
 *
 * Deliberately name-only to remain a low-friction mid-transaction bridge.
 */
import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

export interface InvoiceQuickAddHorseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantType: "lab" | string | null | undefined;
  customerId: string | null;
  onCreated?: (horse: { id: string; name: string; name_ar: string | null }) => void;
}

export function InvoiceQuickAddHorseDialog({
  open,
  onOpenChange,
  tenantId,
  tenantType,
  customerId,
  onCreated,
}: InvoiceQuickAddHorseDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isLab = tenantType === "lab";

  const reset = () => {
    setName("");
    setNameAr("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tenantId) return;
    setSubmitting(true);
    try {
      if (isLab) {
        const { data, error } = await supabase
          .from("lab_horses")
          .insert({
            tenant_id: tenantId,
            created_by: user?.id ?? null,
            source: "manual",
            name: name.trim(),
            name_ar: nameAr.trim() || null,
            client_id: customerId,
          })
          .select("id, name, name_ar")
          .single();
        if (error) throw error;
        if (customerId) {
          const { error: linkErr } = await supabase
            .from("party_horse_links")
            .insert({
              tenant_id: tenantId,
              client_id: customerId,
              lab_horse_id: data.id,
              role: "owner",
            } as any);
          if (linkErr && !linkErr.message?.includes("duplicate")) {
            throw linkErr;
          }
        }
        qc.invalidateQueries({ queryKey: ["invoice-customer-horses"] });
        qc.invalidateQueries({ queryKey: ["lab-horses", tenantId] });
        onCreated?.({ id: data.id, name: data.name, name_ar: data.name_ar });
        toast.success(t("finance.invoices.horseAdded"));
        reset();
        onOpenChange(false);
      } else {
        const { data, error } = await supabase
          .from("horses")
          .insert({
            tenant_id: tenantId,
            created_by: user?.id ?? null,
            name: name.trim(),
            name_ar: nameAr.trim() || null,
          } as any)
          .select("id, name, name_ar")
          .single();
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["invoice-customer-horses"] });
        qc.invalidateQueries({ queryKey: ["horses"] });
        onCreated?.({ id: data.id, name: data.name, name_ar: data.name_ar });
        toast.success(t("finance.invoices.horseAdded"));
        reset();
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Quick add horse failed:", err);
      toast.error(err?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("finance.invoices.quickAddHorse")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qa-horse-name">{t("horses.name")}</Label>
              <Input
                id="qa-horse-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-horse-name-ar">{t("horses.nameAr")}</Label>
              <Input
                id="qa-horse-name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
