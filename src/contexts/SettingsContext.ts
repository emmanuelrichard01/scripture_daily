import { createContext } from "react";

export type ThemePreference = "light" | "dark" | "system";

/** Available Bible translations, keyed by the Bolls API's version id. */
export const TRANSLATIONS = [
  { id: "ESV", name: "English Standard Version" },
  { id: "NIV", name: "New International Version" },
  { id: "NLT", name: "New Living Translation" },
  { id: "NASB", name: "New American Standard Bible" },
  { id: "LSB", name: "Legacy Standard Bible" },
  { id: "WEB", name: "World English Bible" },
  { id: "KJV", name: "King James Version" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];

export const DEFAULT_TRANSLATION: TranslationId = "ESV";

export interface ReminderSettings {
  readonly enabled: boolean;
  /** `HH:MM`, 24-hour, in the user's local time. */
  readonly time: string;
  /** Days of the week to remind on. 0 = Sunday. */
  readonly days: readonly number[];
}

export interface ReaderTypography {
  /** Body size in px, 14–24. */
  readonly fontSize: number;
  readonly fontFamily: "sans" | "serif";
  readonly lineHeight: number;
}

export interface Settings {
  readonly theme: ThemePreference;
  readonly reminders: ReminderSettings;
  readonly hapticFeedback: boolean;
  readonly soundEffects: boolean;
  readonly reduceMotion: boolean;
  readonly translation: TranslationId;
  readonly typography: ReaderTypography;
}

export interface SettingsContextValue {
  readonly settings: Settings;
  readonly updateSettings: (updates: Partial<Settings>) => void;
  readonly updateReminders: (updates: Partial<ReminderSettings>) => void;
  readonly updateTypography: (updates: Partial<ReaderTypography>) => void;
  readonly resetSettings: () => void;
  /** The theme actually applied right now, after resolving `"system"`. */
  readonly resolvedTheme: "light" | "dark";
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
