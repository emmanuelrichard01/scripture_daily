/**
 * Settings defaults and validation.
 *
 * Kept out of the provider so the parser is importable without pulling a React
 * component along with it — and so the provider file exports only a component.
 */

import {
  DEFAULT_TRANSLATION,
  TRANSLATIONS,
  type ReaderMargin,
  type Settings,
  type ThemePreference,
  type TranslationId,
} from "@/contexts/SettingsContext";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const VALID_THEMES = new Set<ThemePreference>(["light", "dark", "sepia", "midnight", "system"]);
const VALID_TRANSLATIONS = new Set<string>(TRANSLATIONS.map((option) => option.id));

/** `HH:MM`, 24-hour. */
export const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  reminders: { enabled: false, time: "07:00", days: [...ALL_DAYS] },
  hapticFeedback: true,
  soundEffects: true,
  reduceMotion: false,
  translation: DEFAULT_TRANSLATION,
  typography: { fontSize: 18, fontFamily: "serif", lineHeight: 1.75, margin: "normal" },
};

const VALID_MARGINS = new Set<ReaderMargin>(["narrow", "normal", "wide"]);

/**
 * Coerces persisted or remote settings into a valid object.
 *
 * Validated field by field rather than spread over the defaults: a stale value
 * from an older release (a theme name since removed, a font size of 400) would
 * otherwise survive a merge and break rendering.
 */
export function parseSettings(input: unknown): Settings | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  const reminders = (raw.reminders ?? {}) as Record<string, unknown>;
  const typography = (raw.typography ?? {}) as Record<string, unknown>;

  const days = Array.isArray(reminders.days)
    ? [...new Set(reminders.days)]
        .filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6)
        .sort((a, b) => a - b)
    : [...ALL_DAYS];

  return {
    theme: VALID_THEMES.has(raw.theme as ThemePreference)
      ? (raw.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
    reminders: {
      enabled: typeof reminders.enabled === "boolean" ? reminders.enabled : false,
      time:
        typeof reminders.time === "string" && HHMM_PATTERN.test(reminders.time)
          ? reminders.time
          : DEFAULT_SETTINGS.reminders.time,
      days: days.length > 0 ? days : [...ALL_DAYS],
    },
    hapticFeedback: typeof raw.hapticFeedback === "boolean" ? raw.hapticFeedback : true,
    soundEffects: typeof raw.soundEffects === "boolean" ? raw.soundEffects : true,
    reduceMotion: typeof raw.reduceMotion === "boolean" ? raw.reduceMotion : false,
    translation: VALID_TRANSLATIONS.has(raw.translation as string)
      ? (raw.translation as TranslationId)
      : DEFAULT_TRANSLATION,
    typography: {
      fontSize:
        typeof typography.fontSize === "number"
          ? Math.min(26, Math.max(14, Math.round(typography.fontSize)))
          : DEFAULT_SETTINGS.typography.fontSize,
      fontFamily: typography.fontFamily === "sans" ? "sans" : "serif",
      lineHeight:
        typeof typography.lineHeight === "number"
          ? Math.min(2.2, Math.max(1.4, typography.lineHeight))
          : DEFAULT_SETTINGS.typography.lineHeight,
      margin: VALID_MARGINS.has(typography.margin as ReaderMargin)
        ? (typography.margin as ReaderMargin)
        : DEFAULT_SETTINGS.typography.margin,
    },
  };
}

export function isValidTheme(value: unknown): value is ThemePreference {
  return VALID_THEMES.has(value as ThemePreference);
}
