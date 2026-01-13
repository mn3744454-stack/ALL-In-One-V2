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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { POSSession } from "@/hooks/pos/usePOSSessions";

interface CloseSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: POSSession | null;
  expectedCash?: number;
  onConfirm: (actualCash: number, notes?: string) => void;
  isLoading?: boolean;
}

export function CloseSessionDialog({
  open,
  onOpenChange,
  session,
  expectedCash = 0,
  onConfirm,
  isLoading,
}: CloseSessionDialogProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();
  const [actualCash, setActualCash] = useState<string>("");
  const [notes, setNotes] = useState("");

  const actualCashNum = Number(actualCash) || 0;
  const variance = actualCashNum - expectedCash;

  const handleConfirm = () => {
    onConfirm(actualCashNum, notes || undefined);
  };

  const handleClose = () => {
    setActualCash("");
    setNotes("");
    onOpenChange(false);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-sm", isRTL && "rtl")}>
        <DialogHeader>
          <DialogTitle>
            {t("finance.pos.session.closeTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session info */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
              <span className="text-muted-foreground">
                {t("finance.pos.session.openingCash")}
              </span>
              <span className="font-medium">{Number(session.opening_cash).toFixed(2)}</span>
            </div>
            <div className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
              <span className="text-muted-foreground">
                {t("finance.pos.session.expectedCash")}
              </span>
              <span className="font-medium">{expectedCash.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Actual cash input */}
          <div className="space-y-2">
            <Label htmlFor="actual-cash">
              {t("finance.pos.session.actualCash")}
            </Label>
            <Input
              id="actual-cash"
              type="number"
              min="0"
              step="0.01"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              className="h-12 text-lg"
              inputMode="decimal"
              placeholder={expectedCash.toFixed(2)}
            />
          </div>

          {/* Variance display */}
          {actualCash !== "" && (
            <div className={cn(
              "p-3 rounded-lg text-center",
              variance === 0 ? "bg-green-100 text-green-800" :
              variance > 0 ? "bg-blue-100 text-blue-800" :
              "bg-red-100 text-red-800"
            )}>
              <span className="text-sm font-medium">
                {t("finance.pos.session.variance")}:{" "}
              </span>
              <span className="text-lg font-bold">
                {variance > 0 ? "+" : ""}{variance.toFixed(2)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="close-notes">
              {t("common.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="close-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={variance !== 0 ? t("finance.pos.session.varianceNote") : ""}
            />
          </div>
        </div>

        <DialogFooter className={cn("gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm} 
            disabled={isLoading || actualCash === ""} 
            className="min-w-[100px]"
          >
            {isLoading ? "..." : t("finance.pos.session.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
