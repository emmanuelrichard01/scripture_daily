import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { readJSON, readRaw, removeRaw, StorageKeys, writeJSON } from "@/lib/storage";
import { SyncEngine } from "@/lib/syncEngine";
import {
  SettingsContext,
  type ReaderTypography,
  type ReminderSettings,
  type Settings,
  type SettingsContextValue,
  type ThemePreference,
} from "@/contexts/SettingsContext";
import {
  DEFAULT_SETTINGS,
  HHMM_PATTERN,
  isValidTheme,
  parseSettings,
} from "@/lib/settings";

/** Reads settings, migrating from the pre-1.0 `horner-settings` key once. */
function loadLocalSettings(): Settings {
  const current = readJSON(StorageKeys.settings, parseSettings);
  if (current) return current;

  const legacyRaw = readRaw(StorageKeys.legacySettings);
  if (legacyRaw) {
    try {
      const migrated = parseSettings(JSON.parse(legacyRaw));
      if (migrated) {
        writeJSON(StorageKeys.settings, migrated);
        removeRaw(StorageKeys.legacySettings);
        return migrated;
      }
    } catch {
      // Unparseable legacy blob — fall through to defaults.
    }
  }
  return DEFAULT_SETTINGS;
}

/** Reads the OS dark-mode preference. */
function prefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(loadLocalSettings);
  const [systemDark, setSystemDark] = useState(prefersDark);

  const userRef = useRef(user);
  userRef.current = user;

  const resolvedTheme: "light" | "dark" | "sepia" | "midnight" =
    settings.theme === "system"
      ? (systemDark ? "dark" : "light")
      : settings.theme;

  // ── Track the OS preference so "system" stays live ──
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // ── Apply the theme to the document ──
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark" || resolvedTheme === "midnight");
    root.classList.toggle("sepia", resolvedTheme === "sepia");
    root.classList.toggle("midnight", resolvedTheme === "midnight");

    root.style.colorScheme =
      resolvedTheme === "light" || resolvedTheme === "sepia" ? "light" : "dark";

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content =
        resolvedTheme === "midnight"
          ? "#000000"
          : resolvedTheme === "dark"
            ? "#0f1019"
            : resolvedTheme === "sepia"
              ? "#f4eee4"
              : "#faf8f5";
    }
  }, [resolvedTheme]);

  // ── Respect the OS reduced-motion setting, and let users force it on ──
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => {
      document.documentElement.classList.toggle(
        "reduce-motion",
        settings.reduceMotion || (query?.matches ?? false),
      );
    };
    apply();
    query?.addEventListener("change", apply);
    return () => query?.removeEventListener("change", apply);
  }, [settings.reduceMotion]);

  // ── Cloud sync ──
  const engine = useMemo(() => new SyncEngine<"settings">({ debounceMs: 800 }), []);
  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    engine.register<Settings>("settings", async (payload) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: currentUser.id,
          theme: payload.theme,
          haptic_feedback: payload.hapticFeedback,
          reminders_enabled: payload.reminders.enabled,
          reminder_time: payload.reminders.time,
          reminder_days: payload.reminders.days.map(String),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw new Error(error.message);
    });
  }, [engine]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    writeJSON(StorageKeys.settings, settings);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (userRef.current) engine.enqueue("settings", settings);
  }, [settings, engine]);

  // ── Pull on sign-in ──
  //
  // Only the fields the server owns are taken. Device-scoped preferences
  // (typography, translation) stay local, because forcing a phone's font size
  // onto a desktop is not a feature.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("theme, haptic_feedback, reminders_enabled, reminder_time, reminder_days")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setSettings((current) => ({
        ...current,
        theme: isValidTheme(data.theme)
          ? (data.theme as ThemePreference)
          : current.theme,
        hapticFeedback: data.haptic_feedback ?? current.hapticFeedback,
        reminders: {
          enabled: data.reminders_enabled ?? current.reminders.enabled,
          time: HHMM_PATTERN.test(data.reminder_time)
            ? data.reminder_time
            : current.reminders.time,
          days:
            data.reminder_days
              ?.map(Number)
              .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) ??
            current.reminders.days,
        },
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...updates }));
  }, []);

  const updateReminders = useCallback((updates: Partial<ReminderSettings>) => {
    setSettings((current) => ({
      ...current,
      reminders: { ...current.reminders, ...updates },
    }));
  }, []);

  const updateTypography = useCallback((updates: Partial<ReaderTypography>) => {
    setSettings((current) => ({
      ...current,
      typography: { ...current.typography, ...updates },
    }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings,
      updateReminders,
      updateTypography,
      resetSettings,
      resolvedTheme,
    }),
    [settings, updateSettings, updateReminders, updateTypography, resetSettings, resolvedTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
