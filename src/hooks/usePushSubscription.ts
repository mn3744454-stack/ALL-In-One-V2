import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getExistingSubscription,
  registerServiceWorker,
} from "@/lib/pushManager";

type PushState = "unsupported" | "default" | "granted" | "denied" | "loading";

export function usePushSubscription() {
  const { user } = useAuth();
  const [pushState, setPushState] = useState<PushState>("loading");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState("unsupported");
      return;
    }

    const permission = Notification.permission;
    setPushState(permission as PushState);

    // Check existing subscription
    getExistingSubscription().then((sub) => {
      setIsSubscribed(!!sub);
    });

    // Register SW on mount
    registerServiceWorker();
  }, []);

  const subscribe = useCallback(async () => {
    if (!user?.id) return false;

    setPushState("loading");

    const permission = await Notification.requestPermission();
    setPushState(permission as PushState);

    if (permission !== "granted") return false;

    const sub = await subscribeToPush(user.id);
    const success = !!sub;
    setIsSubscribed(success);
    return success;
  }, [user?.id]);

  const unsubscribe = useCallback(async () => {
    if (!user?.id) return false;

    const success = await unsubscribeFromPush(user.id);
    if (success) setIsSubscribed(false);
    return success;
  }, [user?.id]);

  return {
    pushState,
    isSubscribed,
    subscribe,
    unsubscribe,
    isSupported: pushState !== "unsupported",
  };
}
