import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useInvitations } from "@/hooks/useInvitations";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getNotificationIcon(eventType: string) {
  if (eventType.startsWith("connection.")) return Link2;
  if (eventType.startsWith("lab_request.message")) return MessageSquare;
  if (eventType.startsWith("lab_request.")) return FlaskConical;
  return Bell;
}

function getNotificationRoute(notification: AppNotification): string {
  const { event_type, entity_type, entity_id } = notification;

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

export function NotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { receivedInvitations } = useInvitations();

  const totalUnread = unreadCount + receivedInvitations.length;

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    const route = getNotificationRoute(notification);
    setOpen(false);
    navigate(route);
  };

  return (
    <>
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>
              Stay updated on partnerships and lab requests
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
              {unreadCount > 0 && (
                <div className="flex justify-end mb-3">
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

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-2">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <NotificationCard
                        key={n.id}
                        notification={n}
                        onMarkRead={() => markAsRead.mutate(n.id)}
                        onDelete={() => deleteNotification.mutate(n.id)}
                        onClick={() => handleNotificationClick(n)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="invitations" className="mt-4">
              <InvitationsContent />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Renders the invitations content inside the unified notifications panel.
 * This extracts the inner content from InvitationsPanel for embedding.
 */
function InvitationsContent() {
  // Re-use the full InvitationsPanel as a standalone embedded component
  // The InvitationsPanel already renders its own Sheet, but we only need the inner content.
  // For now, we render a simplified version that matches the existing pattern.
  const {
    receivedInvitations,
    sentInvitations,
    respondToInvitation,
    revokeInvitation,
  } = useInvitations();
  const navigate = useNavigate();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  if (receivedInvitations.length === 0 && sentInvitations.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No invitations
      </p>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-3 pr-2">
        {receivedInvitations.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Received
            </p>
            {receivedInvitations.map((inv) => (
              <Card key={inv.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <p className="font-semibold text-sm">
                    {inv.tenant_name || "Organization"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Role: {inv.proposed_role} · From: {inv.sender_display_name}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="gold"
                      className="flex-1"
                      onClick={async () => {
                        const { data } = await respondToInvitation(inv.token, true);
                        if (data?.tenant_id) {
                          navigate("/dashboard", { replace: true });
                        }
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => respondToInvitation(inv.token, false)}
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {sentInvitations.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">
              Sent
            </p>
            {sentInvitations.map((inv) => (
              <Card key={inv.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <p className="font-medium text-sm truncate">{inv.invitee_email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        inv.status === "accepted"
                          ? "default"
                          : inv.status === "rejected"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {inv.status}
                    </Badge>
                    <Badge variant="secondary">{inv.proposed_role}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
