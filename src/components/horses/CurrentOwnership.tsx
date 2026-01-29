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

interface CurrentOwnershipProps {
  horseId: string;
  horseName: string;
}

export const CurrentOwnership = ({ horseId, horseName }: CurrentOwnershipProps) => {
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
  const hasPrimary = ownerships.some(o => o.is_primary);

  const handleAddOwner = async () => {
    if (!newOwnerId || !newPercentage) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    const percentage = parseFloat(newPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast({ title: "Error", description: "Invalid percentage", variant: "destructive" });
      return;
    }

    if (totalPercentage + percentage > 100) {
      toast({ 
        title: "Error", 
        description: `Cannot exceed 100%. Remaining: ${100 - totalPercentage}%`, 
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

      toast({ title: "Owner added successfully" });
      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

    if (otherPercentage + percentage > 100) {
      toast({ 
        title: "Error", 
        description: `Cannot exceed 100%. Max allowed: ${100 - otherPercentage}%`, 
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

      toast({ title: "Ownership updated" });
      setShowEditDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

      toast({ title: "Owner removed" });
      setShowDeleteDialog(false);
      setSelectedOwnership(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendOwnershipNotification = async (ownerId: string, action: string, percentage: number) => {
    try {
      // Get owner email
      const owner = owners.find(o => o.id === ownerId);
      if (!owner?.email) return;

      await supabase.functions.invoke("send-ownership-notification", {
        body: {
          owner_email: owner.email,
          owner_name: owner.name,
          horse_name: horseName,
          action,
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            Current Ownership
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Owner
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Ownership</span>
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
                Total should be 100% ({100 - totalPercentage}% remaining)
              </p>
            )}
          </div>

          {/* Owners List */}
          {ownerships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No owners assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerships.map((ownership) => (
                <div 
                  key={ownership.id} 
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                      {ownership.is_primary ? (
                        <Crown className="w-5 h-5 text-gold" />
                      ) : (
                        <Users className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ownership.owner?.name || "Unknown"}</span>
                        {ownership.is_primary && (
                          <Badge variant="default" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      {ownership.owner?.name_ar && (
                        <p className="text-sm text-muted-foreground" dir="rtl">{ownership.owner.name_ar}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-gold">{ownership.ownership_percentage}%</span>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openTransferDialog(ownership)}
                        title="Transfer ownership"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(ownership)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openDeleteDialog(ownership)}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Owner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
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
              <Label>Percentage (%)</Label>
              <Input 
                type="number" 
                min={1} 
                max={100 - totalPercentage}
                value={newPercentage} 
                onChange={(e) => setNewPercentage(e.target.value)}
                placeholder={`Max: ${100 - totalPercentage}%`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newIsPrimary} onCheckedChange={setNewIsPrimary} />
              <Label>Primary Owner</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddOwner} disabled={saving}>
              {saving ? "Adding..." : "Add Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ownership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={selectedOwnership?.owner?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Percentage (%)</Label>
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
              <Label>Primary Owner</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditOwner} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Owner?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {selectedOwnership?.owner?.name} from {horseName}'s ownership? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveOwner}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Removing..." : "Remove"}
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
