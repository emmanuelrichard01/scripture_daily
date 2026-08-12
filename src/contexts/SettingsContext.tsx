import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  preferredVersion: string;
}

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  updateReminders: (updates: Partial<ReminderSettings>) => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

const getDefaultSettings = (): Settings => ({
  theme: "system",
  reminders: {
    enabled: false,
    time: "07:00",
    days: [0, 1, 2, 3, 4, 5, 6], // All days
  },
  hapticFeedback: true,
  notificationPermission: "default",
  preferredVersion: "ESV",
});

const loadLocalSettings = (): Settings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...getDefaultSettings(), ...JSON.parse(saved) };
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultSettings();
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(loadLocalSettings);

  const settingsRef = useRef(settings);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const pushToCloud = useCallback(async (state: Settings) => {
    if (!user) return;
    
    try {
      const { data, error: selectError } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        theme: state.theme,
        haptic_feedback: state.hapticFeedback,
        reminders_enabled: state.reminders.enabled,
        reminder_time: state.reminders.time,
        reminder_days: state.reminders.days.map(String),
        updated_at: new Date().toISOString(),
      };

      if (data) {
        await supabase
          .from("user_settings")
          .update(payload)
          .eq("id", data.id);
      } else {
        await supabase
          .from("user_settings")
          .insert([payload]);
      }
    } catch (e) {
      console.error("Settings cloud sync failed:", e);
    }
  }, [user]);

  // Initial load from cloud when user logs in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadFromCloud = async () => {
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data && isMounted) {
          // Cloud takes precedence on login
          const newSettings: Settings = {
            ...settingsRef.current,
            theme: data.theme as Settings["theme"] || "system",
            hapticFeedback: data.haptic_feedback ?? true,
            reminders: {
              enabled: data.reminders_enabled ?? false,
              time: data.reminder_time || "07:00",
              days: data.reminder_days ? data.reminder_days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
            }
          };

          setSettings(newSettings);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        } else if (isMounted) {
          // No cloud data, push local data to cloud
          pushToCloud(settingsRef.current);
        }
      } catch (err) {
        console.error("Failed to load settings from cloud:", err);
      }
    };

    loadFromCloud();

    return () => {
      isMounted = false;
    };
  }, [user, pushToCloud]);

  // Keep the stored permission in step with the browser's real value
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const actual = Notification.permission;
    setSettings((prev) =>
      prev.notificationPermission === actual
        ? prev
        : { ...prev, notificationPermission: actual }
    );
  }, []);

  // Save to localStorage and debounce push to cloud whenever settings change
  const saveAndSync = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

    if (user) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        pushToCloud(newSettings);
      }, 1000);
    }
  }, [user, pushToCloud]);

  // Apply theme class to document
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

  // We use a wrapper function that handles both.
  const updateSettingsSync = useCallback((updates: Partial<Settings>) => {
    const newSettings = { ...settingsRef.current, ...updates };
    saveAndSync(newSettings);
  }, [saveAndSync]);

  const updateRemindersSync = useCallback((updates: Partial<ReminderSettings>) => {
    const newSettings = {
      ...settingsRef.current,
      reminders: { ...settingsRef.current.reminders, ...updates },
    };
    saveAndSync(newSettings);
  }, [saveAndSync]);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return "denied" as NotificationPermission;
    }

    const permission = await Notification.requestPermission();
    updateSettingsSync({ notificationPermission: permission });
    return permission;
  }, [updateSettingsSync]);

  const value = {
    settings,
    updateSettings: updateSettingsSync,
    updateReminders: updateRemindersSync,
    requestNotificationPermission,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
