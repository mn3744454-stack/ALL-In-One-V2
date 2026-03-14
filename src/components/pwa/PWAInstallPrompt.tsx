import { useEffect, useState } from "react";
import { X, Download, Share2, Plus, Monitor } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PWAInstallPrompt() {
  const { showPrompt, isInstalled, installHelpMode, dismiss, triggerInstall } =
    usePWAInstall();
  const { t, dir } = useI18n();
  const [visible, setVisible] = useState(false);

  // Animate in after a short delay
  useEffect(() => {
    if (showPrompt && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [showPrompt, isInstalled]);

  if (!showPrompt || isInstalled) return null;

  const isRTL = dir === "rtl";

  // State B — iOS manual install
  const renderIOS = () => (
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
      <Button variant="ghost" size="sm" onClick={dismiss} className="w-full mt-1 text-xs h-8">
        {t("pwa.notNow")}
      </Button>
    </div>
  );

  // State A — Native install available
  const renderNative = () => (
    <div className="mt-3 flex items-center gap-2">
      <Button
        onClick={triggerInstall}
        size="sm"
        className="flex-1 h-9 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Download className="h-3.5 w-3.5" />
        {t("pwa.installNow")}
      </Button>
      <Button variant="ghost" size="sm" onClick={dismiss} className="h-9 text-xs text-muted-foreground">
        {t("pwa.notNow")}
      </Button>
    </div>
  );

  // State C — Fallback help
  const renderFallback = () => (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground leading-snug">{t("pwa.fallbackHint")}</p>
      <Button variant="ghost" size="sm" onClick={dismiss} className="w-full text-xs h-8">
        {t("pwa.notNow")}
      </Button>
    </div>
  );

  const titleKey =
    installHelpMode === "ios"
      ? "pwa.iosTitle"
      : installHelpMode === "fallback"
        ? "pwa.fallbackTitle"
        : "pwa.installTitle";

  const subtitleKey =
    installHelpMode === "ios"
      ? ""
      : installHelpMode === "fallback"
        ? "pwa.fallbackSubtitle"
        : "pwa.installSubtitle";

  return (
    <div
      dir={dir}
      className={cn(
        "fixed z-[60] transition-all duration-300 ease-out",
        "bottom-20 inset-x-3 sm:inset-x-auto",
        "sm:bottom-6 sm:max-w-sm sm:w-full",
        isRTL ? "sm:left-6 sm:right-auto" : "sm:right-6 sm:left-auto",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 relative">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 end-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pe-6">
          <img src="/icons/icon-192x192.png" alt={t("pwa.installTitle")} className="h-12 w-12 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {t(titleKey)}
            </h3>
            {subtitleKey && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {t(subtitleKey)}
              </p>
            )}
          </div>
        </div>

        {installHelpMode === "ios"
          ? renderIOS()
          : installHelpMode === "fallback"
            ? renderFallback()
            : renderNative()}
      </div>
    </div>
  );
}
