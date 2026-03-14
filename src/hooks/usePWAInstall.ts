import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const NEW_STORAGE_KEY = "daylihorse:pwa-installed";
const OLD_STORAGE_KEY = "khail:pwa-installed";

const isDev = import.meta.env.DEV;
const log = (...args: unknown[]) => {
  if (isDev) console.log("[PWA Install]", ...args);
};

/** Migrate old localStorage key to new key (backward compat) */
function migrateInstalledKey(): void {
  try {
    const oldVal = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldVal !== null) {
      localStorage.setItem(NEW_STORAGE_KEY, oldVal);
      localStorage.removeItem(OLD_STORAGE_KEY);
      if (isDev) log("Migrated installed key from old brand namespace");
    }
  } catch {
    // Ignore storage errors
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true;
  return false;
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
  return isIOS && isSafari;
}

function isChromiumBrowser(): boolean {
  return /Chrome|Chromium|Edg|Opera|Brave/.test(navigator.userAgent);
}

function isMarkedInstalled(): boolean {
  return localStorage.getItem(NEW_STORAGE_KEY) === "true";
}

export type InstallHelpMode = "none" | "ios" | "fallback";

export interface PWADebug {
  isStandalone: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isChromiumLike: boolean;
  hasDeferredPrompt: boolean;
  canPromptInstall: boolean;
  bannerVisibleReason: string;
  serviceWorkerSupported: boolean;
  serviceWorkerControllerPresent: boolean;
}

export function usePWAInstall() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // Run migration once on module load
  useEffect(() => {
    migrateInstalledKey();
  }, []);

  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return true;
    migrateInstalledKey(); // Also run synchronously for initial state
    return isStandalone() || isMarkedInstalled();
  });
  const [dismissed, setDismissed] = useState(false);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);

  const standalone = typeof window !== "undefined" ? isStandalone() : false;
  const ios = typeof window !== "undefined" ? isIOSSafari() : false;
  const chromiumLike = typeof window !== "undefined" ? isChromiumBrowser() : false;

  // Determine install help mode
  const installHelpMode: InstallHelpMode = ios
    ? "ios"
    : hasDeferredPrompt
      ? "none"
      : "fallback";

  const showPrompt = !isInstalled && !dismissed;

  useEffect(() => {
    log("init", {
      standalone,
      markedInstalled: isMarkedInstalled(),
      ios,
      chromiumLike,
      swSupported: "serviceWorker" in navigator,
      swController: !!navigator.serviceWorker?.controller,
    });

    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setHasDeferredPrompt(true);
      log("beforeinstallprompt fired");
    };

    const installedHandler = () => {
      log("appinstalled");
      localStorage.setItem(NEW_STORAGE_KEY, "true");
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    if (!ios && !chromiumLike) {
      log("fallback path used — non-iOS, non-Chromium browser");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [isInstalled, ios, chromiumLike, standalone]);

  const dismiss = useCallback(() => {
    log("dismissed (session only)");
    setDismissed(true);
  }, []);

  const triggerInstall = useCallback(async () => {
    log("triggerInstall called", { hasDeferredPrompt: !!deferredPrompt.current });
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(NEW_STORAGE_KEY, "true");
      setIsInstalled(true);
    }
    deferredPrompt.current = null;
    setHasDeferredPrompt(false);
  }, []);

  const debug: PWADebug = {
    isStandalone: standalone,
    isInstalled,
    isIOS: ios,
    isChromiumLike: chromiumLike,
    hasDeferredPrompt,
    canPromptInstall: hasDeferredPrompt,
    bannerVisibleReason: isInstalled
      ? "hidden:installed"
      : dismissed
        ? "hidden:dismissed-session"
        : "visible",
    serviceWorkerSupported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    serviceWorkerControllerPresent:
      typeof navigator !== "undefined" && !!navigator.serviceWorker?.controller,
  };

  return {
    isInstallable: hasDeferredPrompt,
    isIOS: ios,
    isInstalled,
    showPrompt,
    installHelpMode,
    dismiss,
    triggerInstall,
    debug,
  };
}
