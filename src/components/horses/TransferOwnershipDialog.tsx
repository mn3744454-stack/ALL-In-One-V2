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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowDown, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HorseOwnership } from "@/hooks/useHorseOwnership";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";

interface Owner {
  id: string;
  name: string;
  name_ar?: string | null;
  email?: string | null;
}

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromOwnership: HorseOwnership;
  allOwnerships: HorseOwnership[];
  availableOwners: Owner[];
  horseId: string;
  horseName: string;
  onSuccess: () => void;
}

export const TransferOwnershipDialog = ({
  open,
  onOpenChange,
  fromOwnership,
  allOwnerships,
  availableOwners,
  horseId,
  horseName,
  onSuccess,
}: TransferOwnershipDialogProps) => {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const [recipientType, setRecipientType] = useState<"existing" | "new">("existing");
  const [recipientId, setRecipientId] = useState("");
  const [transferPercentage, setTransferPercentage] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  // Get existing owners (excluding the current one)
  const existingOwners = allOwnerships.filter(o => o.id !== fromOwnership.id);
  
  // Get available owners (not already owners)
  const newOwnerOptions = availableOwners.filter(
    o => !allOwnerships.some(own => own.owner_id === o.id)
  );

  const maxTransfer = Number(fromOwnership.ownership_percentage);

  const handleTransfer = async () => {
    const percentage = parseFloat(transferPercentage);
    
    if (!recipientId) {
      toast({ title: t('common.error'), description: t('horses.ownership.selectRecipientError'), variant: "destructive" });
      return;
    }

    if (isNaN(percentage) || percentage <= 0 || percentage > maxTransfer) {
      toast({ 
        title: t('common.error'), 
        description: t('horses.ownership.invalidPercentageMax').replace('{{max}}', String(maxTransfer)), 
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    const transferId = crypto.randomUUID();

    try {
      // 1. Update sender's percentage
      const newSenderPercentage = maxTransfer - percentage;
      
      if (newSenderPercentage > 0) {
        const { error: updateError } = await supabase
          .from("horse_ownership" as any)
          .update({ ownership_percentage: newSenderPercentage })
          .eq("id", fromOwnership.id);
        
        if (updateError) throw updateError;
      } else {
        // Remove sender if percentage becomes 0
        const { error: deleteError } = await supabase
          .from("horse_ownership" as any)
          .delete()
          .eq("id", fromOwnership.id);
        
        if (deleteError) throw deleteError;
      }

      // 2. Add/Update recipient
      const existingRecipient = allOwnerships.find(o => o.owner_id === recipientId);
      
      if (existingRecipient) {
        // Update existing owner's percentage
        const newPercentage = Number(existingRecipient.ownership_percentage) + percentage;
        const { error: recipientError } = await supabase
          .from("horse_ownership" as any)
          .update({ ownership_percentage: newPercentage })
          .eq("id", existingRecipient.id);
        
        if (recipientError) throw recipientError;
      } else {
        // Add new owner
        const { error: insertError } = await supabase
          .from("horse_ownership" as any)
          .insert({
            horse_id: horseId,
            owner_id: recipientId,
            ownership_percentage: percentage,
            is_primary: false,
          });
        
        if (insertError) throw insertError;
      }

      // 3. Log transfer in history with effective_date and transfer_id
      await supabase
        .from("horse_ownership_history" as any)
        .insert({
          horse_id: horseId,
          owner_id: recipientId,
          ownership_percentage: percentage,
          is_primary: false,
          action: "transferred",
          effective_date: effectiveDate,
          transfer_id: transferId,
          notes: `Transferred ${percentage}% from ${fromOwnership.owner?.name}`,
        });

      // 4. Send notifications
      await sendTransferNotifications(recipientId, percentage);

      const recipientName = getRecipientName();
      toast({ 
        title: t('horses.ownership.transferSuccess'), 
        description: t('horses.ownership.transferSuccessDesc')
          .replace('{{percentage}}', String(percentage))
          .replace('{{recipient}}', recipientName)
      });
      
      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({ title: t('horses.ownership.transferFailed'), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getRecipientName = () => {
    if (recipientType === "existing") {
      const owner = existingOwners.find(o => o.owner_id === recipientId);
      return owner?.owner?.name || t('horses.ownership.recipient');
    } else {
      const owner = availableOwners.find(o => o.id === recipientId);
      return owner?.name || t('horses.ownership.recipient');
    }
  };

  const sendTransferNotifications = async (recipientOwnerId: string, percentage: number) => {
    try {
      const tenantId = activeTenant?.tenant_id;
      // Notify sender
      const senderOwner = availableOwners.find(o => o.id === fromOwnership.owner_id);
      if (senderOwner?.email) {
        await supabase.functions.invoke("send-ownership-notification", {
          body: {
            tenant_id: tenantId,
            horse_id: horseId,
            event_type: "transferred_out",
            recipient_email: senderOwner.email,
            owner_name: senderOwner.name,
            horse_name: horseName,
            percentage,
            to_owner_name: getRecipientName(),
          },
        });
      }

      // Notify recipient
      const recipientOwner = availableOwners.find(o => o.id === recipientOwnerId);
      if (recipientOwner?.email) {
        await supabase.functions.invoke("send-ownership-notification", {
          body: {
            tenant_id: tenantId,
            horse_id: horseId,
            event_type: "transferred_in",
            recipient_email: recipientOwner.email,
            owner_name: recipientOwner.name,
            horse_name: horseName,
            percentage,
            from_owner_name: fromOwnership.owner?.name,
          },
        });
      }
    } catch (error) {
      console.error("Failed to send transfer notifications:", error);
    }
  };

  const resetForm = () => {
    setRecipientType("existing");
    setRecipientId("");
    setTransferPercentage("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {t('horses.ownership.transferOwnership')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          {/* From */}
          <div className="p-3 rounded-lg bg-muted/50">
            <Label className="text-xs text-muted-foreground">{t('horses.ownership.from')}</Label>
            <p className="font-medium">{fromOwnership.owner?.name}</p>
            <p className="text-sm text-muted-foreground">
              {t('horses.ownership.current')}: {fromOwnership.ownership_percentage}%
            </p>
          </div>

          {/* Arrow - using ArrowDown for RTL compatibility */}
          <div className="flex justify-center py-1">
            <ArrowDown className="w-6 h-6 text-gold" />
          </div>

          {/* Recipient Type */}
          <div className="space-y-2">
            <Label>{t('horses.ownership.transferTo')}</Label>
            <RadioGroup value={recipientType} onValueChange={(v) => { setRecipientType(v as any); setRecipientId(""); }}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal">{t('horses.ownership.existingOwner')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal">{t('horses.ownership.newOwner')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Recipient Selection */}
          <div className="space-y-2">
            <Label>{t('horses.ownership.selectRecipient')}</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('horses.ownership.selectRecipientPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {recipientType === "existing" ? (
                  existingOwners.length > 0 ? (
                    existingOwners.map((ownership) => (
                      <SelectItem key={ownership.owner_id} value={ownership.owner_id}>
                        {ownership.owner?.name} ({ownership.ownership_percentage}%)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>{t('horses.ownership.noOtherOwners')}</SelectItem>
                  )
                ) : (
                  newOwnerOptions.length > 0 ? (
                    newOwnerOptions.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>{t('horses.ownership.noAvailableOwners')}</SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Amount */}
          <div className="space-y-2">
            <Label>{t('horses.ownership.percentageToTransfer')}</Label>
            <Input
              type="number"
              min={1}
              max={maxTransfer}
              value={transferPercentage}
              onChange={(e) => setTransferPercentage(e.target.value)}
              placeholder={t('horses.ownership.maxPlaceholder').replace('{{max}}', String(maxTransfer))}
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('horses.ownership.effectiveDate')}
            </Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleTransfer} disabled={saving || !recipientId || !transferPercentage}>
            {saving ? t('horses.ownership.transferring') : t('horses.ownership.transfer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
