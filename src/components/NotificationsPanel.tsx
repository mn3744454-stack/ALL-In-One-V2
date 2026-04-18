import React, { useState } from "react";
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
import { NotificationQuickDetailDialog } from "@/components/notifications/NotificationQuickDetailDialog";
import { resolveNotificationRoute } from "@/lib/notifications/routeDescriptor";
import {
  getNotificationIcon,
  interpolateNotificationTemplate,
} from "@/lib/notifications/helpers";
import {
  getEventSeverity,
  getFamilyConfig,
  resolveFamily,
  SEVERITY_STYLES,
} from "@/lib/notifications/familyRegistry";
import { resolveSummaryChips } from "@/lib/notifications/summary";
import { resolveDelivery } from "@/lib/notifications/policy";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useTenantNotificationGovernance } from "@/hooks/useTenantNotificationGovernance";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInvitations } from "@/hooks/useInvitations";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { tStatus } from "@/i18n/labels";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";

// Note: Phase 1 — route resolution is centralised in
// src/lib/notifications/routeDescriptor.ts and shared helpers
// (icon + template interpolation) live in
// src/lib/notifications/helpers.ts. The panel no longer
// force-navigates on click and no longer re-implements helpers.


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
  const { t, lang } = useI18n();
  const Icon = getNotificationIcon(notification.event_type);
  const severity = getEventSeverity(notification.event_type);
  const styles = SEVERITY_STYLES[severity];
  const familyCfg = getFamilyConfig(notification.event_type);

  // Normalize dotted event_type for i18n key lookup (e.g. "connection.accepted" → "connection_accepted")
  const safeEventType = notification.event_type.replace(/\./g, '_');

  // Resolve title: i18n key with interpolation → fallback to DB title
  const titleKey = `notifications.events.${safeEventType}.title`;
  const titleRaw = t(titleKey);
  const hasI18nTitle = titleRaw !== titleKey;
  const displayTitle = hasI18nTitle
    ? interpolateNotificationTemplate(titleRaw, notification)
    : notification.title;

  // Resolve body: i18n key with interpolation → fallback to DB body
  const bodyKey = `notifications.events.${safeEventType}.body`;
  const bodyRaw = t(bodyKey);
  const hasI18nBody = bodyRaw !== bodyKey;
  const interpolatedBody = hasI18nBody ? interpolateNotificationTemplate(bodyRaw, notification) : '';
  const displayBody = hasI18nBody && interpolatedBody.replace(/·/g, '').trim()
    ? interpolatedBody
    : notification.body;

  // Localized relative time
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    ...(lang === 'ar' ? { locale: ar } : {}),
  });

  // Smart summary — capped to 2 chips on the card to stay scannable.
  const chips = resolveSummaryChips(notification, { limit: 2, t });

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 border-l-4",
        styles.accent,
        !notification.is_read && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              !notification.is_read ? styles.iconBg : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                !notification.is_read ? styles.iconFg : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            {/* Family chip + unread dot */}
            <div className="flex items-center gap-1.5 mb-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-normal"
              >
                {t(familyCfg.labelKey)}
              </Badge>
              {!notification.is_read && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  aria-hidden
                />
              )}
            </div>
            <p
              className={cn(
                "text-sm leading-snug",
                !notification.is_read ? "font-semibold" : "font-medium"
              )}
            >
              {displayTitle}
            </p>
            {displayBody && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {displayBody}
              </p>
            )}
            {/* Smart summary chips — family-aware, scannable */}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] max-w-full",
                      chip.tone === "status"
                        ? styles.chip
                        : "bg-muted/60 text-muted-foreground border-border"
                    )}
                    title={`${t(chip.labelKey)}: ${chip.value}`}
                  >
                    <span className="opacity-70">{t(chip.labelKey)}</span>
                    <span className="truncate font-medium max-w-[10rem]">
                      {chip.value}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              <Clock className="w-3 h-3 inline me-1" />
              {timeAgo}
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
                title={t('notifications.markAsRead')}
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
              title={t('notifications.delete')}
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
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { preferences } = useNotificationPreferences();
  const { governance } = useTenantNotificationGovernance();
  const { activeRole } = useTenant();
  const { user } = useAuth();
  const viewerIsLeadership =
    activeRole === "owner" || activeRole === "manager";

  // Phase 4 — apply the full governance precedence (platform → org floor →
  // preset → personal + self-suppression + critical-escalation) to the bell
  // list. This is a presentation-layer filter; rows remain in the DB. The
  // server-side push gate now mirrors this resolver in the edge function.
  const visibleNotifications = React.useMemo(() => {
    const map = preferences.family_preferences ?? {};
    return notifications.filter((n) => {
      const family = resolveFamily(n.event_type);
      const severity = getEventSeverity(n.event_type);
      const decision = resolveDelivery({
        family,
        severity,
        viewerUserId: user?.id ?? null,
        actorUserId: n.actor_user_id,
        viewerIsLeadership,
        preferences: map,
        governance,
      });
      return decision.deliver;
    });
  }, [notifications, preferences.family_preferences, governance, user?.id, viewerIsLeadership]);

  const visibleUnreadCount = visibleNotifications.filter((n) => !n.is_read).length;

  // Phase 1 — quick-detail-first interaction.
  // Clicking a notification opens the dialog instead of forcing navigation.
  const [activeNotification, setActiveNotification] =
    useState<AppNotification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const unreadNotifications = visibleNotifications.filter((n) => !n.is_read);
  const readNotifications = visibleNotifications.filter((n) => n.is_read);

  const handleClick = (notification: AppNotification) => {
    setActiveNotification(notification);
    setDetailOpen(true);
    // Note: mark-as-read now fires inside the dialog on open,
    // not on bare card click — so quickly peeking the bell list
    // no longer silently clears unread state.
  };

  return (
    <>
    <Tabs defaultValue="unread" className="mt-2">
      <TabsList className="w-full">
        <TabsTrigger value="unread" className="flex-1 gap-1 text-xs">
          <Bell className="w-3.5 h-3.5" />
          {t('notifications.unread')}
          {visibleUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-1 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px]"
            >
              {visibleUnreadCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="read" className="flex-1 gap-1 text-xs">
          <CheckCheck className="w-3.5 h-3.5" />
          {t('notifications.read')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="unread" className="mt-3">
        {visibleUnreadCount > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="w-3 h-3" />
              {t('notifications.markAllAsRead')}
            </Button>
          </div>
        )}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-2 pr-2">
            {unreadNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {t('notifications.noUnread')}
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
                {t('notifications.noRead')}
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

    <NotificationQuickDetailDialog
      notification={activeNotification}
      open={detailOpen}
      onOpenChange={setDetailOpen}
      onMarkRead={(id) => markAsRead.mutate(id)}
    />
    </>
  );
}

// ─── Invitations sub-content (with sub-tabs) ─────────────

// Role labels now come from i18n: t('notifications.roles.*')

function InvitationsTabContent() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
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
      toast.error(`${t('notifications.failedAccept')}: ${error.message}`);
    } else if (data?.tenant_id) {
      toast.success(t('notifications.invitationAccepted'));
      navigate("/dashboard", { replace: true });
    }
    setRespondingTo(null);
  };

  const handleReject = async (token: string) => {
    const { error } = await respondToInvitation(token, false, rejectionReason);
    if (error) {
      toast.error(`${t('notifications.failedDecline')}: ${error.message}`);
    } else {
      toast.success(t('notifications.invitationDeclined'));
    }
    setRespondingTo(null);
    setRejectionReason("");
  };

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('notifications.inviteLinkCopied'));
    } catch {
      toast.error(t('notifications.failedCopyLink'));
    }
  };

  const handleRevoke = async () => {
    if (!invitationToRevoke) return;
    setRevoking(true);
    const { success, error } = await revokeInvitation(invitationToRevoke);
    setRevoking(false);
    if (error) {
      toast.error(`${t('notifications.failedRevoke')}: ${error.message}`);
    } else if (success) {
      toast.success(t('notifications.invitationRevoked'));
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
            {t('notifications.received')}
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
            {t('notifications.sent')}
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
                  {t('notifications.noInvitations')}
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
                            {t('notifications.from')}: {inv.sender_display_name}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs">
                            {t('notifications.role')}: <Badge variant="secondary" className="text-[10px]">{t(`notifications.roles.${inv.proposed_role}`) || inv.proposed_role}</Badge>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, ...(lang === 'ar' ? { locale: ar } : {}) })}
                        </div>
                      </div>

                      {respondingTo === inv.id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder={t('notifications.declineReason')}
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
                              {t('notifications.confirmDecline')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRespondingTo(null)}
                            >
                              {t('notifications.cancel')}
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
                            <Check className="w-4 h-4 me-1" />
                            {t('notifications.accept')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRespondingTo(inv.id)}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 me-1" />
                            {t('notifications.decline')}
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
                  {t('notifications.noSentInvitations')}
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
                              {t(`notifications.roles.${inv.proposed_role}`) || inv.proposed_role}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, ...(lang === 'ar' ? { locale: ar } : {}) })}
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
                              <Copy className="w-3.5 h-3.5 me-1" />
                              {t('notifications.copyLink')}
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
            <AlertDialogTitle>{t('notifications.revokeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notifications.revokeDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>{t('notifications.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('notifications.revoking')}
                </>
              ) : (
                t('notifications.revoke')
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { receivedInvitations } = useInvitations();

  const totalUnread = unreadCount + receivedInvitations.length;

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
          <span className="absolute -top-1 -end-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[95vw] sm:w-[480px] lg:w-[520px]">
          <SheetHeader>
            <SheetTitle>{t('notifications.title')}</SheetTitle>
            <SheetDescription>
              {t('notifications.subtitle')}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="notifications" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="notifications" className="flex-1 gap-1">
                <Bell className="w-4 h-4" />
                {t('notifications.tabs.notifications')}
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ms-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="invitations" className="flex-1 gap-1">
                <Users className="w-4 h-4" />
                {t('notifications.tabs.invitations')}
                {receivedInvitations.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="ms-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs"
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