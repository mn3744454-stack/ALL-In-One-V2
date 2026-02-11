import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Link2,
  FlaskConical,
  MessageSquare,
  CheckCheck,
  Check,
  Clock,
  Users,
  Trash2,
  Mail,
  Building2,
  User,
  Copy,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useInvitations } from "@/hooks/useInvitations";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

// ─── Notification helpers ─────────────────────────────────

function getNotificationIcon(eventType: string) {
  if (eventType.startsWith("connection.")) return Link2;
  if (eventType.startsWith("lab_request.message")) return MessageSquare;
  if (eventType.startsWith("lab_request.")) return FlaskConical;
  return Bell;
}

function getNotificationRoute(notification: AppNotification): string {
  const { event_type, entity_id } = notification;

  if (event_type.startsWith("connection.")) {
    return "/dashboard/laboratory?tab=requests";
  }

  if (event_type === "lab_request.message_added") {
    return `/dashboard/laboratory?tab=requests&requestId=${entity_id}&openThread=true`;
  }

  if (event_type.startsWith("lab_request.") && entity_id) {
    return `/dashboard/laboratory?tab=requests&requestId=${entity_id}`;
  }

  return "/dashboard/laboratory?tab=requests";
}

// ─── Notification card ────────────────────────────────────

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onClick,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const Icon = getNotificationIcon(notification.event_type);

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-colors hover:bg-muted/50",
        !notification.is_read && "border-primary/30 bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              !notification.is_read ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                !notification.is_read ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm",
                !notification.is_read ? "font-semibold" : "font-medium"
              )}
            >
              {notification.title}
            </p>
            {notification.body && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.body}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3 inline me-1" />
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                title="Mark as read"
              >
                <Check className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notifications sub-content ────────────────────────────

function NotificationsTabContent() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  const handleClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    const route = getNotificationRoute(notification);
    navigate(route);
  };

  return (
    <Tabs defaultValue="unread" className="mt-2">
      <TabsList className="w-full">
        <TabsTrigger value="unread" className="flex-1 gap-1 text-xs">
          <Bell className="w-3.5 h-3.5" />
          Unread
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-1 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="read" className="flex-1 gap-1 text-xs">
          <CheckCheck className="w-3.5 h-3.5" />
          Read
        </TabsTrigger>
      </TabsList>

      <TabsContent value="unread" className="mt-3">
        {unreadCount > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="w-3 h-3" />
              Mark all as read
            </Button>
          </div>
        )}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-2 pr-2">
            {unreadNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No unread notifications
              </p>
            ) : (
              unreadNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkRead={() => markAsRead.mutate(n.id)}
                  onDelete={() => deleteNotification.mutate(n.id)}
                  onClick={() => handleClick(n)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="read" className="mt-3">
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-2 pr-2">
            {readNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No read notifications
              </p>
            ) : (
              readNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkRead={() => {}}
                  onDelete={() => deleteNotification.mutate(n.id)}
                  onClick={() => handleClick(n)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

// ─── Invitations sub-content (with sub-tabs) ─────────────

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  foreman: "Foreman",
  vet: "Veterinarian",
  trainer: "Trainer",
  employee: "Employee",
};

function InvitationsTabContent() {
  const navigate = useNavigate();
  const {
    receivedInvitations,
    sentInvitations,
    respondToInvitation,
    revokeInvitation,
  } = useInvitations();

  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleAccept = async (token: string) => {
    const { data, error } = await respondToInvitation(token, true);
    if (error) {
      toast.error(`Failed to accept: ${error.message}`);
    } else if (data?.tenant_id) {
      toast.success("Invitation accepted!");
      navigate("/dashboard", { replace: true });
    }
    setRespondingTo(null);
  };

  const handleReject = async (token: string) => {
    const { error } = await respondToInvitation(token, false, rejectionReason);
    if (error) {
      toast.error(`Failed to decline: ${error.message}`);
    } else {
      toast.success("Invitation declined");
    }
    setRespondingTo(null);
    setRejectionReason("");
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRevoke = async () => {
    if (!invitationToRevoke) return;
    setRevoking(true);
    const { success, error } = await revokeInvitation(invitationToRevoke);
    setRevoking(false);
    if (error) {
      toast.error(`Failed to revoke: ${error.message}`);
    } else if (success) {
      toast.success("Invitation revoked");
    }
    setRevokeDialogOpen(false);
    setInvitationToRevoke(null);
  };

  return (
    <>
      <Tabs defaultValue="received" className="mt-2">
        <TabsList className="w-full">
          <TabsTrigger value="received" className="flex-1 gap-1 text-xs">
            <Bell className="w-3.5 h-3.5" />
            Received
            {receivedInvitations.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
              >
                {receivedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 gap-1 text-xs">
            <Mail className="w-3.5 h-3.5" />
            Sent
            {sentInvitations.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
              >
                {sentInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Received ── */}
        <TabsContent value="received" className="mt-3">
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="space-y-2 pr-2">
              {receivedInvitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No pending invitations
                </p>
              ) : (
                receivedInvitations.map((inv) => (
                  <Card key={inv.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {inv.tenant_name || "Organization"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            From: {inv.sender_display_name}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">
                            Role: <Badge variant="secondary" className="text-[10px]">{roleLabels[inv.proposed_role] || inv.proposed_role}</Badge>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                        </div>
                      </div>

                      {respondingTo === inv.id ? (
                        <div className="space-y-2">
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
                              onClick={() => handleReject(inv.token)}
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
                            onClick={() => handleAccept(inv.token)}
                            className="flex-1"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRespondingTo(inv.id)}
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
          </ScrollArea>
        </TabsContent>

        {/* ── Sent ── */}
        <TabsContent value="sent" className="mt-3">
          <ScrollArea className="h-[calc(100vh-340px)]">
            <div className="space-y-2 pr-2">
              {sentInvitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No invitations sent yet
                </p>
              ) : (
                sentInvitations.map((inv) => (
                  <Card key={inv.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {inv.invitee_email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant={
                                inv.status === "accepted"
                                  ? "default"
                                  : inv.status === "rejected"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {inv.status}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {roleLabels[inv.proposed_role] || inv.proposed_role}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </div>

                      {(inv.status === "pending" || inv.status === "preaccepted") && (
                        <div className="flex gap-2">
                          {inv.token && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyLink(inv.token)}
                              className="flex-1"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              Copy Link
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setInvitationToRevoke(inv.id);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? The recipient will no longer be able to accept it.
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
    </>
  );
}

// ─── Main panel ───────────────────────────────────────────

export function NotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { receivedInvitations, createInvitation } = useInvitations();
  const { activeTenant } = useTenant();
  const { horses } = useHorses();
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "employee" as TenantRole,
    selectedHorses: [] as string[],
  });

  const totalUnread = unreadCount + receivedInvitations.length;
  const canInvite = activeTenant?.can_invite || activeTenant?.role === "owner";

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

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </Button>

      {/* Invite Button */}
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
                <Label htmlFor="invite-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
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
                          id={`invite-horse-${horse.id}`}
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
                        <label htmlFor={`invite-horse-${horse.id}`} className="text-sm cursor-pointer">
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Stay updated on partnerships, lab requests and invitations
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="notifications" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="notifications" className="flex-1 gap-1">
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invitations" className="flex-1 gap-1">
                <Users className="w-4 h-4" />
                Invitations
                {receivedInvitations.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs"
                  >
                    {receivedInvitations.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="mt-4">
              <NotificationsTabContent />
            </TabsContent>

            <TabsContent value="invitations" className="mt-4">
              <InvitationsTabContent />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}