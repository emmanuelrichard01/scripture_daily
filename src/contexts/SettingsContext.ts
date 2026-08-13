import { createContext } from "react";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Available Bible translations, keyed by the Bolls API's version id.
 *
 * `style` places each one on the literal ↔ readable spectrum, which is the axis
 * people actually choose along. Showing it in the picker turns seven opaque
 * acronyms into a decision someone can make without leaving the app to research
 * them.
 */
export const TRANSLATIONS = [
  {
    id: "ESV",
    name: "English Standard Version",
    style: "Literal, modern",
    year: 2001,
  },
  {
    id: "NIV",
    name: "New International Version",
    style: "Balanced, widely read",
    year: 1978,
  },
  {
    id: "NLT",
    name: "New Living Translation",
    style: "Thought-for-thought, easiest",
    year: 1996,
  },
  {
    id: "NASB",
    name: "New American Standard Bible",
    style: "Most literal",
    year: 1971,
  },
  {
    id: "LSB",
    name: "Legacy Standard Bible",
    style: "Literal, NASB lineage",
    year: 2021,
  },
  {
    id: "WEB",
    name: "World English Bible",
    style: "Modern, public domain",
    year: 2000,
  },
  {
    id: "KJV",
    name: "King James Version",
    style: "Classical, public domain",
    year: 1611,
  },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];

export type Translation = (typeof TRANSLATIONS)[number];

/** Metadata for a translation id, for labels outside the picker. */
export function translationInfo(id: TranslationId): Translation {
  return TRANSLATIONS.find((entry) => entry.id === id) ?? TRANSLATIONS[0];
}

export const DEFAULT_TRANSLATION: TranslationId = "ESV";

export interface ReminderSettings {
  readonly enabled: boolean;
  /** `HH:MM`, 24-hour, in the user's local time. */
  readonly time: string;
  /** Days of the week to remind on. 0 = Sunday. */
  readonly days: readonly number[];
}

export type ReaderMargin = "narrow" | "normal" | "wide";

export interface ReaderTypography {
  /** Body size in px, 14–26. */
  readonly fontSize: number;
  readonly fontFamily: "sans" | "serif";
  readonly lineHeight: number;
  /** Horizontal breathing room around the column of text. */
  readonly margin: ReaderMargin;
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
