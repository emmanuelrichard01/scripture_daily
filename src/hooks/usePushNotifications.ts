import { useState, useEffect, useCallback } from "react";
import { useSettings } from "./useSettings";

const SW_PATH = "/sw.js";
const VAPID_PUBLIC_KEY = ""; // Would be configured in production

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isLoading: boolean;
}

export function usePushNotifications() {
  const { settings, updateReminders } = useSettings();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "default",
    subscription: null,
    isLoading: false,
  });

  // Check support and current state
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      if (!isSupported) {
        setState((prev) => ({ ...prev, isSupported: false }));
        return;
      }

      const permission = Notification.permission;

      // Check for existing subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState({
          isSupported: true,
          permission,
          subscription,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error checking push subscription:", error);
        setState((prev) => ({
          ...prev,
          isSupported: true,
          permission,
          isLoading: false,
        }));
      }
    };

    checkSupport();
  }, []);

  // Request permission and subscribe
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      return { success: false, error: "Push notifications not supported" };
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== "granted") {
        setState((prev) => ({ ...prev, isLoading: false }));
        return { success: false, error: "Permission denied" };
      }

      // Register service worker if not already
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register(SW_PATH);
        await navigator.serviceWorker.ready;
      }

      // For now, we'll use local notifications scheduled via setTimeout
      // Full push would require a backend service and VAPID keys
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (error) {
      console.error("Error requesting push permission:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: "Failed to enable notifications" };
    }
  }, [state.isSupported]);

  // Schedule a local notification (for PWA)
  const scheduleNotification = useCallback(
    (title: string, options: NotificationOptions, delay: number) => {
      if (state.permission !== "granted") return null;

      const timeoutId = setTimeout(() => {
        try {
          new Notification(title, {
            ...options,
            icon: "/apple-touch-icon.png",
            badge: "/favicon.png",
          });
        } catch (error) {
          console.error("Error showing notification:", error);
        }
      }, delay);

      return timeoutId;
    },
    [state.permission]
  );

  // Schedule daily reminder based on settings
  const scheduleDailyReminder = useCallback(() => {
    if (!settings.reminders.enabled || state.permission !== "granted") {
      return;
    }

    const now = new Date();
    const [hours, minutes] = settings.reminders.time.split(":").map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Check if today is a reminder day
    const dayOfWeek = scheduledTime.getDay();
    if (!settings.reminders.days.includes(dayOfWeek)) {
      return;
    }

    const delay = scheduledTime.getTime() - now.getTime();

    // Gentle notification copy aligned with reverent design
    const messages = [
      "Your daily Scripture awaits",
      "A moment for Scripture today?",
      "10 chapters ready for you",
      "Continue your reading journey",
      "Scripture for your day",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return scheduleNotification(
      "Scripture Daily",
      {
        body: randomMessage,
        tag: "daily-reminder",
        requireInteraction: false,
        silent: false,
      },
      delay
    );
  }, [settings.reminders, state.permission, scheduleNotification]);

  // Test notification
  const sendTestNotification = useCallback(() => {
    if (state.permission !== "granted") return;

    try {
      new Notification("Scripture Daily", {
        body: "Notifications are working! Your daily reminders are set.",
        icon: "/apple-touch-icon.png",
        badge: "/favicon.png",
        tag: "test-notification",
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  }, [state.permission]);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isLoading: state.isLoading,
    requestPermission,
    scheduleNotification,
    scheduleDailyReminder,
    sendTestNotification,
  };
}
