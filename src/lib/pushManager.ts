/// <reference lib="webworker" />

import { supabase } from "@/integrations/supabase/client";

let cachedVapidKey: string | null = null;

async function fetchVapidKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (error || !data?.vapidPublicKey) {
      console.error("[Push] Failed to fetch VAPID key:", error);
      return null;
    }
    cachedVapidKey = data.vapidPublicKey;
    return cachedVapidKey;
  } catch (err) {
    console.error("[Push] Error fetching VAPID key:", err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Edge/.test(ua)) return `Chrome on ${detectPlatform()}`;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return `Safari on ${detectPlatform()}`;
  if (/Firefox/.test(ua)) return `Firefox on ${detectPlatform()}`;
  if (/Edge/.test(ua)) return `Edge on ${detectPlatform()}`;
  return `Browser on ${detectPlatform()}`;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[Push] Service worker registered:", registration.scope);
    return registration;
  } catch (err) {
    console.error("[Push] SW registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(
  userId: string
): Promise<PushSubscription | null> {
  console.log("[Push] subscribeToPush called for user:", userId);
  
  const vapidKey = await fetchVapidKey();
  console.log("[Push] VAPID key fetched:", !!vapidKey, "length:", vapidKey?.length);
  
  if (!vapidKey) {
    console.error("[Push] VAPID public key not available from server.");
    return null;
  }

  const registration = await registerServiceWorker();
  console.log("[Push] SW registration:", !!registration);
  if (!registration) return null;

  try {
    const pm = (registration as any).pushManager;
    if (!pm) {
      console.error("[Push] PushManager not available on registration");
      return null;
    }

    // Check for existing subscription
    let subscription = await pm.getSubscription();
    console.log("[Push] Existing subscription:", !!subscription);

    if (!subscription) {
      console.log("[Push] Creating new subscription...");
      subscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log("[Push] New subscription created:", !!subscription);
    }

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");

    if (!key || !auth) {
      console.error("[Push] Missing p256dh or auth keys");
      return null;
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
    const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

    console.log("[Push] Saving subscription to DB, endpoint:", subscription.endpoint.substring(0, 50) + "...");

    // Upsert to push_subscriptions table
    const { error } = await supabase.from("push_subscriptions" as any).upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
        device_label: getDeviceLabel(),
        platform: detectPlatform(),
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" }
    );

    if (error) {
      console.error("[Push] Failed to save subscription:", error.message, error.details, error.hint);
      return null;
    }

    console.log("[Push] Subscription saved successfully");
    return subscription;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return null;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const pm = (registration as any).pushManager;
    const subscription = pm ? await pm.getSubscription() : null;

    if (subscription) {
      // Deactivate in DB
      await supabase
        .from("push_subscriptions" as any)
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("endpoint", subscription.endpoint);

      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error("[Push] Unsubscribe failed:", err);
    return false;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    const pm = (registration as any).pushManager;
    return pm ? await pm.getSubscription() : null;
  } catch {
    return null;
  }
}
