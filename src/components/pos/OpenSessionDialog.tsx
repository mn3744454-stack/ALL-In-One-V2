import React, { useState } from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
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
import { cn } from "@/lib/utils";

interface OpenSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (openingCash: number, notes?: string) => void;
  isLoading?: boolean;
}

export function OpenSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: OpenSessionDialogProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();
  const [openingCash, setOpeningCash] = useState<string>("0");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(Number(openingCash) || 0, notes || undefined);
  };

  const handleClose = () => {
    setOpeningCash("0");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-sm", isRTL && "rtl")}>
        <DialogHeader>
          <DialogTitle>
            {t("finance.pos.session.openTitle", "Open POS Session")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="opening-cash">
              {t("finance.pos.session.openingCash", "Opening Cash")}
            </Label>
            <Input
              id="opening-cash"
              type="number"
              min="0"
              step="0.01"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="h-12 text-lg"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-notes">
              {t("common.notes", "Notes")} ({t("common.optional", "optional")})
            </Label>
            <Textarea
              id="session-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className={cn("gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="min-w-[100px]">
            {isLoading ? "..." : t("finance.pos.session.open", "Open Session")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
