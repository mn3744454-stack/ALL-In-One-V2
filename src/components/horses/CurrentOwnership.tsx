import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, ArrowRightLeft, Pencil, Trash2, Crown, AlertCircle } from "lucide-react";
import { useHorseOwnership, HorseOwnership } from "@/hooks/useHorseOwnership";
import { useHorseMasterData } from "@/hooks/useHorseMasterData";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";

interface CurrentOwnershipProps {
  horseId: string;
  horseName: string;
}

export const CurrentOwnership = ({ horseId, horseName }: CurrentOwnershipProps) => {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const { 
    ownerships, 
    loading, 
    fetchOwnerships, 
    addOwnership, 
    updateOwnership, 
    removeOwnership,
    getTotalPercentage 
  } = useHorseOwnership(horseId);
  const { owners, fetchOwners } = useHorseMasterData();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState<HorseOwnership | null>(null);
  
  // Form state
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newPercentage, setNewPercentage] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOwnerships();
    fetchOwners();
  }, [horseId]);

  const totalPercentage = getTotalPercentage();
  const remainingPercentage = 100 - totalPercentage;

  const handleAddOwner = async () => {
    if (!newOwnerId || !newPercentage) {
      toast({ title: t('common.error'), description: t('horses.ownership.fillAllFields'), variant: "destructive" });
      return;
    }

    const percentage = parseFloat(newPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast({ title: t('common.error'), description: t('horses.ownership.invalidPercentage'), variant: "destructive" });
      return;
    }

    if (totalPercentage + percentage > 100) {
      toast({ 
        title: t('common.error'), 
        description: t('horses.ownership.cannotExceed100').replace('{{remaining}}', String(remainingPercentage)), 
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await addOwnership(horseId, newOwnerId, percentage, newIsPrimary);
      if (error) throw error;

      // Send notification
      await sendOwnershipNotification(newOwnerId, "added", percentage);

      toast({ title: t('horses.ownership.ownerAdded') });
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditOwner = async () => {
    if (!selectedOwnership || !newPercentage) return;

    const percentage = parseFloat(newPercentage);
    const otherPercentage = ownerships
      .filter(o => o.id !== selectedOwnership.id)
      .reduce((sum, o) => sum + Number(o.ownership_percentage), 0);

    const maxAllowed = 100 - otherPercentage;
    if (otherPercentage + percentage > 100) {
      toast({ 
        title: t('common.error'), 
        description: t('horses.ownership.maxAllowed').replace('{{max}}', String(maxAllowed)), 
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateOwnership(selectedOwnership.id, { 
        ownership_percentage: percentage,
        is_primary: newIsPrimary 
      });
      if (error) throw error;

      // Send notification
      await sendOwnershipNotification(selectedOwnership.owner_id, "updated", percentage);

      toast({ title: t('horses.ownership.ownerUpdated') });
      setShowEditDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOwner = async () => {
    if (!selectedOwnership) return;

    setSaving(true);
    try {
      // Send notification before removal
      await sendOwnershipNotification(selectedOwnership.owner_id, "removed", selectedOwnership.ownership_percentage);

      const { error } = await removeOwnership(selectedOwnership.id);
      if (error) throw error;

      toast({ title: t('horses.ownership.ownerRemoved') });
      setShowDeleteDialog(false);
      setSelectedOwnership(null);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendOwnershipNotification = async (ownerId: string, action: string, percentage: number) => {
    try {
      const owner = owners.find(o => o.id === ownerId);
      if (!owner?.email) return;

      await supabase.functions.invoke("send-ownership-notification", {
        body: {
          tenant_id: activeTenant?.tenant_id,
          horse_id: horseId,
          event_type: action,
          recipient_email: owner.email,
          owner_name: owner.name,
          horse_name: horseName,
          percentage,
        },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const openEditDialog = (ownership: HorseOwnership) => {
    setSelectedOwnership(ownership);
    setNewPercentage(ownership.ownership_percentage.toString());
    setNewIsPrimary(ownership.is_primary);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (ownership: HorseOwnership) => {
    setSelectedOwnership(ownership);
    setShowDeleteDialog(true);
  };

  const openTransferDialog = (ownership: HorseOwnership) => {
    setSelectedOwnership(ownership);
    setShowTransferDialog(true);
  };

  const resetForm = () => {
    setNewOwnerId("");
    setNewPercentage("");
    setNewIsPrimary(false);
    setSelectedOwnership(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            {t('horses.ownership.currentOwnership')}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('horses.ownership.addOwner')}</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('horses.ownership.totalOwnership')}</span>
              <span className={totalPercentage === 100 ? "text-success font-medium" : "text-warning font-medium"}>
                {totalPercentage}%
              </span>
            </div>
            <Progress 
              value={totalPercentage} 
              className={`h-2 ${totalPercentage === 100 ? '[&>div]:bg-success' : '[&>div]:bg-warning'}`} 
            />
            {totalPercentage !== 100 && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('horses.ownership.totalShouldBe100').replace('{{remaining}}', String(remainingPercentage))}
              </p>
            )}
          </div>

          {/* Owners List */}
          {ownerships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('horses.ownership.noOwnersAssigned')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerships.map((ownership) => (
                <div 
                  key={ownership.id} 
                  className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow overflow-hidden"
                >
                  {/* Top row: Avatar + Name + Percentage */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      {ownership.is_primary ? (
                        <Crown className="w-5 h-5 text-gold" />
                      ) : (
                        <Users className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{ownership.owner?.name || t('common.unknown')}</span>
                        {ownership.is_primary && (
                          <Badge variant="default" className="text-xs shrink-0">{t('horses.ownership.primary')}</Badge>
                        )}
                      </div>
                      {ownership.owner?.name_ar && (
                        <p className="text-sm text-muted-foreground truncate" dir="rtl">{ownership.owner.name_ar}</p>
                      )}
                    </div>
                    <span className="font-bold text-lg text-gold shrink-0">{ownership.ownership_percentage}%</span>
                  </div>

                  {/* Bottom row: Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openTransferDialog(ownership)}
                      className="gap-1.5 h-8 px-2 sm:px-3"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('horses.ownership.transfer')}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(ownership)}
                      className="gap-1.5 h-8 px-2 sm:px-3"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('common.edit')}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openDeleteDialog(ownership)}
                      className="gap-1.5 h-8 px-2 sm:px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('common.delete')}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Owner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('horses.ownership.addOwner')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('horses.ownership.owner')}</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('horses.ownership.selectOwner')} />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter(o => !ownerships.some(own => own.owner_id === o.id))
                    .map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('horses.ownership.percentage')}</Label>
              <Input 
                type="number" 
                min={1} 
                max={remainingPercentage}
                value={newPercentage} 
                onChange={(e) => setNewPercentage(e.target.value)}
                placeholder={t('horses.ownership.maxPlaceholder').replace('{{max}}', String(remainingPercentage))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newIsPrimary} onCheckedChange={setNewIsPrimary} />
              <Label>{t('horses.ownership.primaryOwner')}</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddOwner} disabled={saving}>
              {saving ? t('common.loading') : t('horses.ownership.addOwner')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('horses.ownership.editOwnership')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('horses.ownership.owner')}</Label>
              <Input value={selectedOwnership?.owner?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t('horses.ownership.percentage')}</Label>
              <Input 
                type="number" 
                min={1} 
                max={100}
                value={newPercentage} 
                onChange={(e) => setNewPercentage(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newIsPrimary} onCheckedChange={setNewIsPrimary} />
              <Label>{t('horses.ownership.primaryOwner')}</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditOwner} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('horses.ownership.removeOwner')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('horses.ownership.removeOwnerConfirm')
                .replace('{{owner}}', selectedOwnership?.owner?.name || '')
                .replace('{{horse}}', horseName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveOwner}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? t('horses.ownership.removing') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Dialog */}
      {selectedOwnership && (
        <TransferOwnershipDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          fromOwnership={selectedOwnership}
          allOwnerships={ownerships}
          availableOwners={owners}
          horseId={horseId}
          horseName={horseName}
          onSuccess={() => {
            fetchOwnerships();
            setShowTransferDialog(false);
            setSelectedOwnership(null);
          }}
        />
      )}
    </>
  );
};
