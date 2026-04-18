/**
 * NotificationQuickDetailDialog — Phase 2 enrichment.
 *
 * Phase 1 established this as the family-agnostic shell that opens instead of
 * forcing navigation. Phase 2 makes it more useful without redesigning it:
 *   - severity-coded header accent (sourced from the family registry)
 *   - smart summary chip row (same resolver the card uses → guaranteed
 *     consistency between bell list and detail view)
 *   - optional family-specific compact detail block (e.g. lab message body)
 *
 * The shell stays generic: families plug in via the registry + summary
 * resolver, never by editing this file. New families in Phase 2+ get
 * card and dialog enrichment for free.
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
import { Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/hooks/useNotifications";
import { resolveNotificationRoute } from "@/lib/notifications/routeDescriptor";
import {
  getNotificationIcon,
  interpolateNotificationTemplate,
} from "@/lib/notifications/helpers";
import {
  getEventSeverity,
  getFamilyConfig,
  SEVERITY_STYLES,
} from "@/lib/notifications/familyRegistry";
import { resolveSummaryChips } from "@/lib/notifications/summary";

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

  // Mark-read trigger fires on dialog OPEN (Phase 1 contract — preserved).
  useEffect(() => {
    if (open && notification && !notification.is_read) {
      onMarkRead(notification.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notification?.id]);

  if (!notification) return null;

  const descriptor = resolveNotificationRoute(notification);
  const familyCfg = getFamilyConfig(notification.event_type);
  const severity = getEventSeverity(notification.event_type);
  const styles = SEVERITY_STYLES[severity];
  const Icon = getNotificationIcon(notification.event_type);

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

  // Full chip set (no card cap) — gives the dialog its richer summary.
  const chips = resolveSummaryChips(notification, { limit: "all" });

  // Family-specific compact block — currently a richer message preview for
  // lab message events. New families can add their own small block here
  // without touching the shell.
  const meta = (notification.metadata || {}) as Record<string, unknown>;
  const messagePreview =
    notification.event_type === "lab_request.message_added"
      ? ((meta.message_preview as string) || notification.body || "")
      : "";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Severity-coded header strip */}
        <div
          className={cn(
            "border-l-4 px-6 pt-6 pb-4",
            styles.accent
          )}
        >
          <DialogHeader className="text-start space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center",
                  styles.iconBg
                )}
              >
                <Icon className={cn("w-4 h-4", styles.iconFg)} />
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-normal"
              >
                {t(familyCfg.labelKey)}
              </Badge>
              {chips.find((c) => c.id === "status") && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px] font-normal", styles.chip)}
                >
                  {chips.find((c) => c.id === "status")!.value}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base leading-snug">
              {displayTitle}
            </DialogTitle>
            {displayBody && (
              <DialogDescription className="text-sm">
                {displayBody}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 space-y-3">
          {/* Family-specific compact block: lab message preview */}
          {messagePreview && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t("notifications.summary.message")}</span>
              </div>
              <p className="leading-relaxed line-clamp-4">{messagePreview}</p>
            </div>
          )}

          {/* Smart summary chips (full set) */}
          {chips.filter((c) => c.id !== "status").length > 0 && (
            <div className="space-y-1.5">
              {chips
                .filter((c) => c.id !== "status")
                .map((chip) => (
                  <SummaryRow
                    key={chip.id}
                    label={t(chip.labelKey)}
                    value={chip.value}
                  />
                ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <DialogFooter className={cn("gap-2 sm:gap-2 px-6 pb-6")}>
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
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-end font-medium break-words max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
