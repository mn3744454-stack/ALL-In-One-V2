import { useEffect, useState } from "react";
import { X, Download, Share2, Plus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PWAInstallPrompt() {
  const { showPrompt, isIOS, isInstalled, dismiss, triggerInstall } = usePWAInstall();
  const { t, dir } = useI18n();
  const [visible, setVisible] = useState(false);

  // Animate in after showPrompt becomes true
  useEffect(() => {
    if (showPrompt && !isInstalled) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [showPrompt, isInstalled]);

  if (!showPrompt || isInstalled) return null;

  const isRTL = dir === "rtl";

  return (
    <div
      dir={dir}
      className={cn(
        // Base
        "fixed z-[60] transition-all duration-300 ease-out",
        // Mobile: bottom sheet above bottom nav
        "bottom-20 inset-x-3 sm:inset-x-auto",
        // Desktop/Tablet: floating card on opposite side of sidebar
        "sm:bottom-6 sm:max-w-sm sm:w-full",
        isRTL ? "sm:left-6 sm:right-auto" : "sm:right-6 sm:left-auto",
        // Animation
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 relative">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 end-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pe-6">
          {/* App icon */}
          <img
            src="/icons/icon-192x192.png"
            alt="Khail"
            className="h-12 w-12 rounded-xl shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {isIOS ? t("pwa.iosTitle") : t("pwa.installTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isIOS ? "" : t("pwa.installSubtitle")}
            </p>
          </div>
        </div>

        {isIOS ? (
          /* iOS manual install instructions */
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-muted shrink-0">
                <Share2 className="h-3.5 w-3.5 text-primary" />
              </span>
              <span>{t("pwa.iosStep1")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-muted shrink-0">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </span>
              <span>{t("pwa.iosStep2")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              className="w-full mt-1 text-xs h-8"
            >
              {t("pwa.notNow")}
            </Button>
          </div>
        ) : (
          /* Standard install CTA */
          <div className="mt-3 flex items-center gap-2">
            <Button
              onClick={triggerInstall}
              size="sm"
              className="flex-1 h-9 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              {t("pwa.installNow")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              className="h-9 text-xs text-muted-foreground"
            >
              {t("pwa.notNow")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
