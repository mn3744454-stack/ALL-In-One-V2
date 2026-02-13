import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { isIOS, isStandalone } from "@/lib/pushManager";
import { useI18n } from "@/i18n";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function PushPermissionBanner() {
  const { pushState, isSubscribed, subscribe, isSupported } = usePushSubscription();
  const { t } = useI18n();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isIOS() && !isStandalone()) {
      setShowIOSGuide(true);
    }
  }, []);

  // Show only when: supported, not subscribed, and not denied
  if (!isSupported || isSubscribed || pushState === "denied" || pushState === "granted") {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
  };

  if (showIOSGuide) {
    return (
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 relative">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">
              {t("pushNotifications.iosGuideTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("pushNotifications.iosGuideBody")}
            </p>
            <Link
              to="/dashboard/settings/notifications"
              className="text-xs text-primary underline mt-2 inline-block"
            >
              {t("sidebar.notificationSettings")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 relative">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">
            {t("pushNotifications.bannerTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("pushNotifications.bannerBody")}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
            >
              {t("pushNotifications.enable")}
            </Button>
            <Link
              to="/dashboard/settings/notifications"
              className="text-xs text-primary underline"
            >
              {t("sidebar.notificationSettings")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
