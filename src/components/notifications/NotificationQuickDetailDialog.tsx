/**
 * NotificationQuickDetailDialog — Phase 1 reusable shell.
 *
 * Replaces forced-navigation-on-click with a quick-detail-first flow:
 *   1. User clicks a notification → this dialog opens (no route change).
 *   2. User can read the summary + close → returns to original page.
 *   3. User can explicitly press "Open full record" → deep-link navigation.
 *
 * Built generically so Phase 2 can plug in family-specific summary blocks
 * without touching the click flow or the source CTA.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { useI18n } from "@/i18n";
import { tStatus } from "@/i18n/labels";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/hooks/useNotifications";
import { resolveNotificationRoute } from "@/lib/notifications/routeDescriptor";
import {
  getNotificationIcon,
  interpolateNotificationTemplate,
} from "@/lib/notifications/helpers";

interface Props {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once when the dialog opens for an unread notification. */
  onMarkRead: (id: string) => void;
  /** Optional close callback (Phase 1 just closes — no navigation side effect). */
  onClose?: () => void;
}

export function NotificationQuickDetailDialog({
  notification,
  open,
  onOpenChange,
  onMarkRead,
  onClose,
}: Props) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  // Mark-read trigger now fires on dialog OPEN (not on bare card click),
  // so users who only peek at the bell list keep their unread state.
  useEffect(() => {
    if (open && notification && !notification.is_read) {
      onMarkRead(notification.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notification?.id]);

  if (!notification) return null;

  const descriptor = resolveNotificationRoute(notification);
  const meta = notification.metadata || {};

  const safeEventType = notification.event_type.replace(/\./g, "_");
  const titleKey = `notifications.events.${safeEventType}.title`;
  const titleRaw = t(titleKey);
  const hasI18nTitle = titleRaw !== titleKey;
  const displayTitle = hasI18nTitle
    ? interpolateNotificationTemplate(titleRaw, notification)
    : notification.title;

  const bodyKey = `notifications.events.${safeEventType}.body`;
  const bodyRaw = t(bodyKey);
  const hasI18nBody = bodyRaw !== bodyKey;
  const interpolatedBody = hasI18nBody
    ? interpolateNotificationTemplate(bodyRaw, notification)
    : "";
  const displayBody =
    hasI18nBody && interpolatedBody.replace(/·/g, "").trim()
      ? interpolatedBody
      : notification.body;

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    ...(lang === "ar" ? { locale: ar } : {}),
  });

  // ── Family chip (small visual cue; expanded in Phase 2) ──
  const familyLabel = t(`notifications.families.${descriptor.family}`);

  const handleOpenSource = () => {
    if (!descriptor.sourceUrl) return;
    onOpenChange(false);
    onClose?.();
    navigate(descriptor.sourceUrl);
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px]">
              {familyLabel}
            </Badge>
            {meta.status && (
              <Badge variant="outline" className="text-[10px]">
                {tStatus(meta.status)}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base">{displayTitle}</DialogTitle>
          {displayBody && (
            <DialogDescription className="text-sm">
              {displayBody}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Summary chips (Phase 1: identity-only; Phase 2 adds family blocks) */}
        <div className="space-y-2 text-sm">
          {meta.actor_tenant_name && (
            <SummaryRow
              label={t("notifications.fromOrg")}
              value={meta.actor_tenant_name}
            />
          )}
          {meta.actor_user_name && (
            <SummaryRow
              label={t("notifications.actor")}
              value={meta.actor_user_name}
            />
          )}
          {meta.horse_name && (
            <SummaryRow
              label={t("notifications.horse")}
              value={meta.horse_name}
            />
          )}
          {meta.entity_label && (
            <SummaryRow
              label={t("notifications.reference")}
              value={meta.entity_label}
            />
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <DialogFooter className={cn("gap-2 sm:gap-2")}>
          <Button variant="outline" onClick={handleClose}>
            {t("notifications.close")}
          </Button>
          {descriptor.hasSource && descriptor.sourceUrl && (
            <Button onClick={handleOpenSource}>
              {t(descriptor.ctaLabelKey)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
