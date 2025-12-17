import { useState } from "react";
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
  Clock
} from "lucide-react";
import { toast } from "sonner";

type TenantRole = "owner" | "admin" | "foreman" | "vet" | "trainer" | "employee";

const roleLabels: Record<TenantRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  foreman: "Foreman",
  vet: "Veterinarian",
  trainer: "Trainer",
  employee: "Employee",
};

export const InvitationsPanel = () => {
  const { receivedInvitations, sentInvitations, createInvitation, respondToInvitation, loading } = useInvitations();
  const { horses } = useHorses();
  const { activeTenant } = useTenant();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "employee" as TenantRole,
    selectedHorses: [] as string[],
  });
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  const handleAccept = async (invitationId: string) => {
    const { error } = await respondToInvitation(invitationId, true, true);
    if (error) {
      toast.error("Failed to accept invitation");
    } else {
      toast.success("Invitation accepted! You have joined the organization.");
    }
    setRespondingTo(null);
  };

  const handleReject = async (invitationId: string) => {
    const { error } = await respondToInvitation(invitationId, false, false, rejectionReason);
    if (error) {
      toast.error("Failed to reject invitation");
    } else {
      toast.success("Invitation declined");
    }
    setRespondingTo(null);
    setRejectionReason("");
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
              Review and respond to organization invitations
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
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
                            onClick={() => handleReject(invitation.id)}
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
                          onClick={() => handleAccept(invitation.id)}
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
          </div>
        </SheetContent>
      </Sheet>

      {/* Send Invitation Button */}
      {canInvite && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              Invite
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
                    <SelectItem value="admin">Administrator</SelectItem>
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
    </div>
  );
};
