import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useBoardingAdmissions, type BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { useHorseMovements, type CreateMovementData } from "@/hooks/movement/useHorseMovements";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface CheckoutDialogProps {
  admission: BoardingAdmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckoutDialog({ admission, open, onOpenChange, onSuccess }: CheckoutDialogProps) {
  const [notes, setNotes] = useState('');
  const { checkout, isCheckingOut } = useBoardingAdmissions();
  const { recordMovement } = useHorseMovements();

  const handleCheckout = async () => {
    try {
      await checkout({
        admissionId: admission.id,
        checkoutNotes: notes || undefined,
      });

      // Record checkout movement with clear_housing
      const movementData: CreateMovementData = {
        horse_id: admission.horse_id,
        movement_type: 'out',
        from_location_id: admission.branch_id,
        from_area_id: admission.area_id || null,
        from_unit_id: admission.unit_id || null,
        reason: 'Boarding admission checkout',
        notes: notes || undefined,
        clear_housing: true,
      };

      await recordMovement(movementData);

      setNotes('');
      onSuccess?.();
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Checkout: {admission.horse?.name}</AlertDialogTitle>
          <AlertDialogDescription>
            This will check out the horse and release the housing unit.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Admission summary */}
          <div className="text-sm space-y-1">
            {admission.unit && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Unit:</span>
                <Badge variant="secondary">{admission.unit.code}</Badge>
                <span className="text-xs text-muted-foreground">(will be released)</span>
              </div>
            )}
            {admission.client && (
              <div>
                <span className="text-muted-foreground">Client: </span>
                <span className="font-medium">{admission.client.name}</span>
              </div>
            )}
          </div>

          {/* Balance warning placeholder - Phase 4 will enhance */}
          <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span className="text-muted-foreground">Financial review will be enhanced in a future update</span>
          </div>

          <div>
            <Label>Checkout Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the checkout..."
              rows={2}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCheckingOut}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCheckout} disabled={isCheckingOut}>
            {isCheckingOut ? 'Processing...' : 'Confirm Checkout'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
