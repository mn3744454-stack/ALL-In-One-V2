import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInvitations } from "@/hooks/useInvitations";
import { useHorses } from "@/hooks/useHorses";
import { useTenant } from "@/contexts/TenantContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bell, 
  Send, 
  Check, 
  X, 
  Mail, 
  Building2,
  User,
  Clock,
  Copy,
  Users,
  Trash2,
  Loader2
} from "lucide-react";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Note: "admin" is kept for backward compatibility with existing database records but is not used in UI
type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

const roleLabels: Record<TenantRole, string> = {
  owner: "Owner",
  admin: "Administrator", // Legacy - not assignable
  manager: "Manager",
  foreman: "Foreman",
  vet: "Veterinarian",
  trainer: "Trainer",
  employee: "Employee",
};

export const InvitationsPanel = () => {
  const navigate = useNavigate();
  const { receivedInvitations, sentInvitations, createInvitation, respondToInvitation, revokeInvitation, loading } = useInvitations();
  const { horses } = useHorses();
  const { activeTenant, refreshTenants, setActiveTenant } = useTenant();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "employee" as TenantRole,
    selectedHorses: [] as string[],
  });
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteData.email) {
      toast.error("Please enter an email address");
      return;
    }

    const { error } = await createInvitation({
      invitee_email: inviteData.email,
      proposed_role: inviteData.role,
      assigned_horse_ids: inviteData.selectedHorses,
    });

    if (error) {
      toast.error("Failed to send invitation");
    } else {
      toast.success("Invitation sent successfully");
      setInviteOpen(false);
      setInviteData({ email: "", role: "employee", selectedHorses: [] });
    }
  };

  const handleCopyInviteLink = async (token: string) => {
    const origin = window.location.origin;
    const link = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleAccept = async (token: string) => {
    const { data, error } = await respondToInvitation(token, true);
    if (error) {
      console.error("Accept invitation error:", error);
      toast.error(`Failed to accept invitation: ${error.message}`);
    } else if (data?.tenant_id) {
      toast.success("Invitation accepted! Switching to organization...");
      // Refresh tenants and switch to the new tenant
      await refreshTenants();
      setActiveTenant(data.tenant_id);
      navigate("/dashboard", { replace: true });
    }
    setRespondingTo(null);
  };

  const handleReject = async (token: string) => {
    const { error } = await respondToInvitation(token, false, rejectionReason);
    if (error) {
      console.error("Reject invitation error:", error);
      toast.error(`Failed to decline invitation: ${error.message}`);
    } else {
      toast.success("Invitation declined");
    }
    setRespondingTo(null);
    setRejectionReason("");
  };

  const handleRevoke = async () => {
    if (!invitationToRevoke) return;
    
    setRevoking(true);
    const { success, error } = await revokeInvitation(invitationToRevoke);
    setRevoking(false);
    
    if (error) {
      console.error("Revoke invitation error:", error);
      toast.error(`Failed to revoke invitation: ${error.message}`);
    } else if (success) {
      toast.success("Invitation revoked");
    }
    
    setRevokeDialogOpen(false);
    setInvitationToRevoke(null);
  };

  const openRevokeDialog = (invitationId: string) => {
    setInvitationToRevoke(invitationId);
    setRevokeDialogOpen(true);
  };

  const canInvite = activeTenant?.can_invite || activeTenant?.role === "owner";
  const pendingCount = receivedInvitations.length;

  return (
    <div className="flex items-center gap-2">
      {/* Received Invitations Bell */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invitations</SheetTitle>
            <SheetDescription>
              Manage organization invitations
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="received" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="received" className="flex-1 gap-1">
                <Bell className="w-4 h-4" />
                Received
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 gap-1">
                <Users className="w-4 h-4" />
                Sent
              </TabsTrigger>
            </TabsList>

            {/* Received Invitations Tab */}
            <TabsContent value="received" className="mt-4 space-y-4">
              {receivedInvitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending invitations
                </p>
              ) : (
                receivedInvitations.map((invitation) => (
                  <Card key={invitation.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy">
                            {invitation.tenant?.name || "Organization"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Invited by {invitation.sender?.full_name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Role: <Badge variant="secondary">{roleLabels[invitation.proposed_role]}</Badge>
                          </span>
                        </div>
                        {invitation.assigned_horse_ids.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {invitation.assigned_horse_ids.length} horse(s) assigned
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {respondingTo === invitation.id ? (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Reason for declining (optional)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(invitation.token)}
                            className="flex-1"
                          >
                            Confirm Decline
                          </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRespondingTo(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => handleAccept(invitation.token)}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRespondingTo(invitation.id)}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Sent Invitations Tab */}
            <TabsContent value="sent" className="mt-4 space-y-4">
              {sentInvitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No invitations sent yet
                </p>
              ) : (
                sentInvitations.map((invitation) => (
                  <Card key={invitation.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {invitation.invitee_email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={
                              invitation.status === 'accepted' ? 'default' :
                              invitation.status === 'rejected' ? 'destructive' :
                              invitation.status === 'preaccepted' ? 'secondary' :
                              'outline'
                            }>
                              {invitation.status}
                            </Badge>
                            <Badge variant="secondary">{roleLabels[invitation.proposed_role]}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Clock className="w-3 h-3" />
                        Sent {new Date(invitation.created_at).toLocaleDateString()}
                      </div>

                      {(invitation.status === 'pending' || invitation.status === 'preaccepted') && (
                        <div className="flex gap-2">
                          {invitation.token && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyInviteLink(invitation.token)}
                              className="flex-1"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Link
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRevokeDialog(invitation.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Send Invitation Button */}
      {canInvite && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="sm:w-auto sm:px-3 sm:gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join {activeTenant?.tenant.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) => setInviteData({ ...inviteData, role: value as TenantRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="foreman">Foreman</SelectItem>
                    <SelectItem value="vet">Veterinarian</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {horses.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign Horses (optional)</Label>
                  <div className="max-h-[150px] overflow-y-auto border rounded-lg p-2 space-y-2">
                    {horses.map((horse) => (
                      <div key={horse.id} className="flex items-center gap-2">
                        <Checkbox
                          id={horse.id}
                          checked={inviteData.selectedHorses.includes(horse.id)}
                          onCheckedChange={(checked) => {
                            setInviteData({
                              ...inviteData,
                              selectedHorses: checked
                                ? [...inviteData.selectedHorses, horse.id]
                                : inviteData.selectedHorses.filter((id) => id !== horse.id),
                            });
                          }}
                        />
                        <label htmlFor={horse.id} className="text-sm cursor-pointer">
                          {horse.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="gold" className="w-full" onClick={handleSendInvite}>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The recipient will no longer be able to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
