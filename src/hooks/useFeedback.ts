import { useCallback, useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import {
  playChime,
  playCompletionChord,
  vibrate,
  type HapticPattern,
} from "@/lib/feedback";

/**
 * Sound and vibration, gated on the user's preferences.
 *
 * A single hook for both so call sites express intent ("a chapter was marked")
 * rather than orchestrating two subsystems and duplicating the preference
 * checks — which is how the Reader ended up calling a method that never existed.
 */
export function useFeedback() {
  const { settings } = useSettings();
  const { hapticFeedback, soundEffects } = settings;

  const haptic = useCallback(
    (pattern: HapticPattern = "light") => {
      if (hapticFeedback) vibrate(pattern);
    },
    [hapticFeedback],
  );

  /** A chapter was marked read. */
  const chapterComplete = useCallback(() => {
    if (hapticFeedback) vibrate("light");
    if (soundEffects) playChime();
  }, [hapticFeedback, soundEffects]);

  /** The tenth and final chapter of the day was marked read. */
  const dayComplete = useCallback(() => {
    if (hapticFeedback) vibrate("success");
    if (soundEffects) playCompletionChord();
  }, [hapticFeedback, soundEffects]);

  return useMemo(
    () => ({ haptic, chapterComplete, dayComplete }),
    [haptic, chapterComplete, dayComplete],
  );
}
