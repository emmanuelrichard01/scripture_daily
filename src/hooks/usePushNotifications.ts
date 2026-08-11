import { useState, useEffect, useCallback } from "react";
import { useSettings } from "./useSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PushNotificationState {
  isSupported: boolean;
  hasServiceWorker: boolean;
  isLoading: boolean;
}

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * usePushNotifications
 * Fully implemented real background push notifications via VAPID and Service Worker.
 */
export function usePushNotifications() {
  const { settings, requestNotificationPermission } = useSettings();
  const { user } = useAuth();
  const permission = settings.notificationPermission;

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    hasServiceWorker: false,
    isLoading: false,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const isSupported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      if (!isSupported) {
        if (!cancelled) {
          setState({ isSupported: false, hasServiceWorker: false, isLoading: false });
        }
        return;
      }

      let hasServiceWorker = false;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        hasServiceWorker = !!registration;
      } catch {
        hasServiceWorker = false;
      }

      if (!cancelled) {
        setState({ isSupported, hasServiceWorker, isLoading: false });
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!user || !PUBLIC_VAPID_KEY) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
      }

      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("p256dh") as ArrayBuffer)));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("auth") as ArrayBuffer)));

      // Save to Supabase
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth
      }, { onConflict: "endpoint" });

    } catch (error) {
      console.error("Failed to subscribe to push notifications", error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      return { success: false, error: "This browser doesn't support notifications" };
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await requestNotificationPermission();
      
      if (result === "granted") {
        await subscribeToPush();
      }

      setState((prev) => ({ ...prev, isLoading: false }));

      if (result !== "granted") {
        return { success: false, error: "Notification permission was declined" };
      }
      return { success: true };
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: "Couldn't enable notifications" };
    }
  }, [state.isSupported, requestNotificationPermission, user]);

  const showNotification = useCallback(
    (title: string, options: NotificationOptions = {}) => {
      // Local fallback in case push hasn't triggered yet
      if (permission !== "granted") return;
      try {
        new Notification(title, {
          icon: "/apple-touch-icon.png",
          badge: "/favicon.png",
          ...options,
        });
      } catch (e) {
        if (state.hasServiceWorker) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              icon: "/apple-touch-icon.png",
              badge: "/favicon.png",
              ...options,
            });
          });
        }
      }
    },
    [permission, state.hasServiceWorker]
  );

  const scheduleLocalReminder = useCallback(
    (timeString: string, title: string, options: NotificationOptions = {}) => {
      if (permission !== "granted") return () => {};

      const now = new Date();
      const [hours, minutes] = timeString.split(":").map(Number);
      
      let targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);

      if (targetTime.getTime() <= now.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const timeUntil = targetTime.getTime() - now.getTime();
      
      // We still set a local timeout as a fallback while the app is open
      const timeoutId = setTimeout(() => {
        showNotification(title, options);
        scheduleLocalReminder(timeString, title, options);
      }, timeUntil);

      return () => clearTimeout(timeoutId);
    },
    [permission, showNotification]
  );

  return {
    isSupported: state.isSupported,
    hasServiceWorker: state.hasServiceWorker,
    isLoading: state.isLoading,
    permission,
    requestPermission,
    showNotification,
    scheduleLocalReminder,
  };
}
