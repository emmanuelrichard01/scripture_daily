import { useState, useEffect, useCallback } from "react";
import { useSettings } from "./useSettings";

interface PushNotificationState {
  isSupported: boolean;
  hasServiceWorker: boolean;
  isLoading: boolean;
}

/**
 * Local (in-tab) reminder notifications.
 *
 * There is intentionally no push backend and no app-shell service worker in
 * this project, so this hook degrades gracefully: it uses the Notification API
 * directly and only touches a service worker if one already happens to be
 * registered (e.g. a messaging worker).
 */
export function usePushNotifications() {
  const { settings, requestNotificationPermission } = useSettings();
  const permission = settings.notificationPermission;

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    hasServiceWorker: false,
    isLoading: false,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const isSupported = typeof window !== "undefined" && "Notification" in window;
      if (!isSupported) {
        if (!cancelled) {
          setState({ isSupported: false, hasServiceWorker: false, isLoading: false });
        }
        return;
      }

      let hasServiceWorker = false;
      if ("serviceWorker" in navigator) {
        try {
          hasServiceWorker = !!(await navigator.serviceWorker.getRegistration());
        } catch {
          hasServiceWorker = false;
        }
      }

      if (!cancelled) {
        setState({ isSupported: true, hasServiceWorker, isLoading: false });
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      return {
        success: false,
        error: "This browser doesn't support notifications",
      };
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await requestNotificationPermission();
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
  }, [state.isSupported, requestNotificationPermission]);

  const showNotification = useCallback(
    (title: string, options: NotificationOptions = {}) => {
      if (permission !== "granted") return;
      try {
        new Notification(title, {
          icon: "/apple-touch-icon.png",
          badge: "/favicon.png",
          ...options,
        });
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [permission]
  );

  const scheduleNotification = useCallback(
    (title: string, options: NotificationOptions, delay: number) => {
      if (permission !== "granted") return null;
      return setTimeout(() => showNotification(title, options), delay);
    },
    [permission, showNotification]
  );

  /**
   * Schedules today's (or tomorrow's) reminder for as long as the tab stays
   * open. Returns null when nothing was scheduled.
   */
  const scheduleDailyReminder = useCallback(() => {
    if (!settings.reminders.enabled || permission !== "granted") return null;

    const now = new Date();
    const [hours, minutes] = settings.reminders.time.split(":").map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    if (!settings.reminders.days.includes(scheduledTime.getDay())) return null;

    const messages = [
      "Your daily Scripture awaits",
      "A moment for Scripture today?",
      "10 chapters ready for you",
      "Continue your reading journey",
      "Scripture for your day",
    ];

    return scheduleNotification(
      "Scripture Daily",
      {
        body: messages[Math.floor(Math.random() * messages.length)],
        tag: "daily-reminder",
        requireInteraction: false,
      },
      scheduledTime.getTime() - now.getTime()
    );
  }, [settings.reminders, permission, scheduleNotification]);

  const sendTestNotification = useCallback(() => {
    showNotification("Scripture Daily", {
      body: "Notifications are working. Your daily reminders are set.",
      tag: "test-notification",
    });
  }, [showNotification]);

  return {
    isSupported: state.isSupported,
    hasServiceWorker: state.hasServiceWorker,
    permission,
    isLoading: state.isLoading,
    requestPermission,
    scheduleNotification,
    scheduleDailyReminder,
    sendTestNotification,
  };
}
