import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { useLocations } from "@/hooks/movement/useLocations";
import { useQueryClient } from "@tanstack/react-query";

interface EditBranchDialogProps {
  branch: { id: string; name: string; name_ar?: string | null; city: string | null; address: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBranchDialog({ branch, open, onOpenChange }: EditBranchDialogProps) {
  const { t } = useI18n();
  const { updateLocation, isUpdating } = useLocations();
  const queryClient = useQueryClient();

  const [name, setName] = useState(branch.name);
  const [nameAr, setNameAr] = useState(branch.name_ar || "");
  const [city, setCity] = useState(branch.city || "");
  const [address, setAddress] = useState(branch.address || "");

  useEffect(() => {
    if (open) {
      setName(branch.name);
      setNameAr(branch.name_ar || "");
      setCity(branch.city || "");
      setAddress(branch.address || "");
    }
  }, [open, branch]);

  const handleSave = async () => {
    await updateLocation({
      id: branch.id,
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
    queryClient.invalidateQueries({ queryKey: ['expanded-branch-detail'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('housing.branchActions.edit')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('housing.branchWizard.branchName')} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('housing.branchWizard.branchNameAr')}</Label>
            <Input value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('housing.branchWizard.city')}</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('housing.branchWizard.address')}</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
