/**
 * Phase 1.e.f.8.1.4.d.3.fix.1.r1.qa1.local — Local Record Completion Dialog.
 *
 * Renders ONLY the currently-missing safely-editable fields returned by
 * `get_horse_file_access().capabilities.local_record_completion_editable_fields`.
 * It NEVER shows Gender, Breed, Reproductive Role, Height/Weight, Owner
 * or Tenant fields — those are governance-restricted and must not be
 * touched from a local completion path.
 *
 * Governance guarantees:
 *   - No ownership row is ever created here.
 *   - No horse_ownership / horse_owners table is touched.
 *   - Every writable field is filtered against the backend `editable`
 *     allowlist at submit time; the RPC re-validates under lock.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useCompleteLocalHorseRecord } from "@/hooks/useCompleteLocalHorseRecord";
import { mapHorseSaveError } from "@/lib/horseErrorMessages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseId: string;
  tenantId: string;
  editableFields: string[];
  onCompleted?: () => void;
}

const TEXT_FIELDS = new Set([
  "name",
  "name_ar",
  "registration_number",
  "microchip_number",
  "passport_number",
  "ueln",
  "avatar_url",
]);
const LONG_TEXT_FIELDS = new Set([
  "mane_marks",
  "body_marks",
  "legs_marks",
  "distinctive_marks_notes",
]);

export function LocalRecordCompletionDialog({
  open,
  onOpenChange,
  horseId,
  tenantId,
  editableFields,
  onCompleted,
}: Props) {
  const { t } = useI18n();
  const mutation = useCompleteLocalHorseRecord();
  const [values, setValues] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([]);

  // Reset local state whenever the dialog opens for a new horse.
  useEffect(() => {
    if (open) setValues({});
  }, [open, horseId]);

  // Fetch colors only when color_id is missing.
  useEffect(() => {
    if (!open || !tenantId) return;
    if (!editableFields.includes("color_id")) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("horse_colors")
        .select("id,name,name_ar")
        .eq("tenant_id", tenantId)
        .order("name");
      if (!cancelled && data) setColors(data as any);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tenantId, editableFields]);

  const orderedFields = useMemo(() => {
    const order = [
      "name",
      "name_ar",
      "birth_date",
      "color_id",
      "registration_number",
      "microchip_number",
      "passport_number",
      "ueln",
      "avatar_url",
      "mane_marks",
      "body_marks",
      "legs_marks",
      "distinctive_marks_notes",
    ];
    return order.filter((f) => editableFields.includes(f));
  }, [editableFields]);

  const handleSubmit = async () => {
    // Only send fields the user actually filled.
    const payload: Record<string, string | null> = {};
    for (const f of orderedFields) {
      const v = values[f];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        payload[f] = String(v).trim();
      }
    }
    if (Object.keys(payload).length === 0) {
      toast({
        title: t("horses.errors.emptyPayload.title"),
        description: t("horses.errors.emptyPayload.description"),
        variant: "destructive",
      });
      return;
    }
    try {
      await mutation.mutateAsync({
        horseId,
        activeTenantId: tenantId,
        payload,
      });
      toast({
        title: t("horses.localRecord.completed.title"),
        description: t("horses.localRecord.completed.description"),
      });
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      const friendly = mapHorseSaveError(err, t);
      toast({
        title: friendly.title,
        description: friendly.description,
        variant: "destructive",
      });
    }
  };

  const labelFor = (f: string): string => {
    switch (f) {
      case "name":
        return t("horses.wizard.name");
      case "name_ar":
        return t("horses.wizard.nameAr");
      case "birth_date":
        return t("horses.wizard.birthDate");
      case "color_id":
        return t("horses.profile.color");
      case "registration_number":
        return t("horses.wizard.registrationNumber");
      case "microchip_number":
        return t("horses.wizard.microchip");
      case "passport_number":
        return t("horses.wizard.passport");
      case "ueln":
        return t("horses.wizard.ueln");
      case "avatar_url":
        return t("horses.wizard.avatarUrl");
      case "mane_marks":
        return t("horses.wizard.maneMarks");
      case "body_marks":
        return t("horses.wizard.bodyMarks");
      case "legs_marks":
        return t("horses.wizard.legsMarks");
      case "distinctive_marks_notes":
        return t("horses.wizard.distinctiveMarks");
      default:
        return f;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("horses.localRecord.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("horses.localRecord.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2">
          {orderedFields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("horses.localRecord.dialog.nothingMissing")}
            </p>
          )}
          {orderedFields.map((f) => {
            if (f === "birth_date") {
              return (
                <div key={f} className="space-y-1.5">
                  <Label htmlFor={`lrc-${f}`}>{labelFor(f)}</Label>
                  <Input
                    id={`lrc-${f}`}
                    type="date"
                    value={values[f] ?? ""}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [f]: e.target.value }))
                    }
                  />
                </div>
              );
            }
            if (f === "color_id") {
              return (
                <div key={f} className="space-y-1.5">
                  <Label>{labelFor(f)}</Label>
                  <Select
                    value={values[f] ?? ""}
                    onValueChange={(v) =>
                      setValues((s) => ({ ...s, [f]: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name_ar || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (LONG_TEXT_FIELDS.has(f)) {
              return (
                <div key={f} className="space-y-1.5">
                  <Label htmlFor={`lrc-${f}`}>{labelFor(f)}</Label>
                  <Textarea
                    id={`lrc-${f}`}
                    rows={2}
                    value={values[f] ?? ""}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [f]: e.target.value }))
                    }
                  />
                </div>
              );
            }
            if (TEXT_FIELDS.has(f)) {
              return (
                <div key={f} className="space-y-1.5">
                  <Label htmlFor={`lrc-${f}`}>{labelFor(f)}</Label>
                  <Input
                    id={`lrc-${f}`}
                    value={values[f] ?? ""}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [f]: e.target.value }))
                    }
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending || orderedFields.length === 0}
          >
            {mutation.isPending
              ? t("common.saving")
              : t("horses.localRecord.dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
