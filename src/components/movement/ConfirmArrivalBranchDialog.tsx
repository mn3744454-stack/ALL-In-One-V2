import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { CheckCircle2 } from "lucide-react";

interface Branch {
  id: string;
  name: string | null;
  name_ar: string | null;
}

interface ConfirmArrivalBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (branchId: string) => Promise<void> | void;
  isProcessing: boolean;
  boardingContractId?: string | null;
  sourceType?: 'boarding_contract' | 'movement' | null;
}

export function ConfirmArrivalBranchDialog({
  open, onOpenChange, onConfirm, isProcessing, boardingContractId, sourceType = 'boarding_contract',
}: ConfirmArrivalBranchDialogProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const [selected, setSelected] = useState<string>("");
  const [defaulted, setDefaulted] = useState<string>("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["confirm-arrival-branches", tenantId],
    enabled: !!tenantId && open,
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, name_ar")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Branch[];
    },
  });

  const { data: preferredBranchId = null } = useQuery({
    queryKey: ["confirm-arrival-preferred-branch", boardingContractId],
    enabled: !!boardingContractId && open,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("boarding_contracts")
        .select("preferred_branch_id")
        .eq("id", boardingContractId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.preferred_branch_id as string | null) ?? null;
    },
  });

  // Compute default on open / when branches load.
  useEffect(() => {
    if (!open) return;
    if (isLoading) return;
    if (selected) return;
    let next = "";
    if (preferredBranchId && branches.some((b) => b.id === preferredBranchId)) {
      next = preferredBranchId;
    } else if (branches.length === 1) {
      next = branches[0].id;
    }
    setDefaulted(next);
    setSelected(next);
  }, [open, isLoading, branches, preferredBranchId, selected]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelected("");
      setDefaulted("");
      setDiscardOpen(false);
    }
  }, [open]);

  const { isDirty } = useDirtyForm({ selected }, open);
  const dirty = isDirty && selected !== defaulted;

  const hint = useMemo(() => {
    if (preferredBranchId && branches.some((b) => b.id === preferredBranchId)) {
      return t("movement.incoming.confirmArrivalBranch.preferredHint");
    }
    if (branches.length === 1) {
      return t("movement.incoming.confirmArrivalBranch.soleHint");
    }
    return t("movement.incoming.confirmArrivalBranch.multiHint");
  }, [preferredBranchId, branches, t]);

  const displayName = (b: Branch) => {
    if (lang === "ar") return b.name_ar || b.name || "";
    return b.name || b.name_ar || "";
  };
  const secondaryName = (b: Branch) => {
    if (lang === "ar") return b.name && b.name_ar ? b.name : "";
    return b.name && b.name_ar ? b.name_ar : "";
  };

  const requestClose = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (dirty && !isProcessing) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selected || isProcessing) return;
    await onConfirm(selected);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (dirty || isProcessing) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {t("movement.incoming.confirmArrivalBranch.title")}
            </DialogTitle>
            <DialogDescription>
              {t("movement.incoming.confirmArrivalBranch.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label>{t("movement.incoming.confirmArrivalBranch.receivingBranch")}</Label>
            <Select
              value={selected}
              onValueChange={setSelected}
              disabled={isLoading || isProcessing}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("movement.incoming.confirmArrivalBranch.selectPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span>{displayName(b)}</span>
                    {secondaryName(b) && (
                      <span className="text-muted-foreground ms-2 text-xs">
                        {secondaryName(b)}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => requestClose(false)}
              disabled={isProcessing}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!selected || isProcessing}>
              {t("movement.incoming.confirmArrivalBranch.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("movement.incoming.confirmArrivalBranch.dirtyDiscardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("movement.incoming.confirmArrivalBranch.dirtyDiscardDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
