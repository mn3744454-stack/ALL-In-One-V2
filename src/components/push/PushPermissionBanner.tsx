import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { isIOS, isStandalone } from "@/lib/pushManager";
import { useI18n } from "@/i18n";
import { useState, useEffect } from "react";

export function PushPermissionBanner() {
  const { pushState, isSubscribed, subscribe, isSupported } = usePushSubscription();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissed state
    const wasDismissed = localStorage.getItem("push_banner_dismissed");
    if (wasDismissed) setDismissed(true);

    // iOS detection
    if (isIOS() && !isStandalone()) {
      setShowIOSGuide(true);
    }
  }, []);

  // Don't show if: not supported, already subscribed, denied, or dismissed
  if (!isSupported || isSubscribed || pushState === "denied" || pushState === "granted" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push_banner_dismissed", "true");
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  if (showIOSGuide) {
    return (
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 end-2 p-1 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 end-2 p-1 rounded-lg hover:bg-primary/10 transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
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
          <Button
            size="sm"
            className="mt-3"
            onClick={handleEnable}
          >
            {t("pushNotifications.enable")}
          </Button>
        </div>
      </div>
    </div>
  );
}
