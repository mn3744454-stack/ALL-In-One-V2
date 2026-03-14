import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEYS = {
  dismissed: "khail:pwa-install-dismissed-at",
  installed: "khail:pwa-installed",
} as const;

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true; // iOS
  return false;
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  return isIOS && isSafari;
}

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(STORAGE_KEYS.dismissed);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DURATION_MS;
}

function isMarkedInstalled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.installed) === "true";
}

export function usePWAInstall() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // assume installed until proven otherwise
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Immediately check installed state
    const installed = isStandalone() || isMarkedInstalled();
    setIsInstalled(installed);
    if (installed) return;

    const ios = isIOSSafari();
    setIsIOS(ios);

    // For iOS Safari: show prompt if not dismissed recently
    if (ios) {
      if (!isDismissedRecently()) {
        // Small delay so app shell settles first
        const timer = setTimeout(() => setShowPrompt(true), 2500);
        return () => clearTimeout(timer);
      }
      return;
    }

    // For Chromium: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
      if (!isDismissedRecently()) {
        setTimeout(() => setShowPrompt(true), 2500);
      }
    };

    const installedHandler = () => {
      localStorage.setItem(STORAGE_KEYS.installed, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.dismissed, String(Date.now()));
    setShowPrompt(false);
  }, []);

  const triggerInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(STORAGE_KEYS.installed, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    }
    deferredPrompt.current = null;
  }, []);

  return {
    isInstallable,
    isIOS,
    isInstalled,
    showPrompt,
    dismiss,
    triggerInstall,
  };
}
