import { useState, useEffect, useCallback } from "react";

const SETTINGS_KEY = "horner-settings";

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  days: number[]; // 0-6, where 0 is Sunday
}

export interface Settings {
  theme: "light" | "dark" | "system" | "auto";
  reminders: ReminderSettings;
  hapticFeedback: boolean;
  notificationPermission: NotificationPermission | "default";
}

const getDefaultSettings = (): Settings => ({
  theme: "system",
  reminders: {
    enabled: false,
    time: "07:00",
    days: [0, 1, 2, 3, 4, 5, 6], // All days
  },
  hapticFeedback: true,
  notificationPermission: "default",
});

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return { ...getDefaultSettings(), ...JSON.parse(saved) };
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply theme (auto theme handled separately in useAutoTheme)
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.theme === "auto") {
      // Auto theme is handled by useAutoTheme hook
      return;
    } else if (settings.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", settings.theme === "dark");
    }
  }, [settings.theme]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateReminders = useCallback((updates: Partial<ReminderSettings>) => {
    setSettings((prev) => ({
      ...prev,
      reminders: { ...prev.reminders, ...updates },
    }));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return "denied" as NotificationPermission;
    }

    const permission = await Notification.requestPermission();
    updateSettings({ notificationPermission: permission });
    return permission;
  }, [updateSettings]);

  const scheduleReminder = useCallback(() => {
    if (!settings.reminders.enabled || settings.notificationPermission !== "granted") {
      return;
    }

    // For web, we use the Service Worker approach
    // This is a placeholder - actual implementation would require SW registration
    console.log("Reminder scheduled for:", settings.reminders.time);
  }, [settings.reminders, settings.notificationPermission]);

  return {
    settings,
    updateSettings,
    updateReminders,
    requestNotificationPermission,
    scheduleReminder,
  };
}
