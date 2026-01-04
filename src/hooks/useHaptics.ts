import { useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

// iOS haptic patterns using AudioContext (works on iOS Safari)
const createHapticContext = () => {
  let audioContext: AudioContext | null = null;
  
  const initContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext;
  };
  
  return {
    initContext,
    getContext: () => audioContext,
  };
};

const hapticContext = createHapticContext();

// Vibration patterns for different feedback types
const vibrationPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 50, 25],
  error: [50, 30, 50, 30, 50],
};

export function useHaptics() {
  const { settings } = useSettings();

  const triggerHaptic = useCallback(
    (type: HapticType = "light") => {
      if (!settings.hapticFeedback) return;

      // Check if we're on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Try native vibration API first (Android and some browsers)
      if ("vibrate" in navigator) {
        try {
          const pattern = vibrationPatterns[type];
          navigator.vibrate(pattern);
          return;
        } catch {
          // Vibration not supported, continue
        }
      }

      // For iOS, use AudioContext trick to trigger haptic
      if (isIOS) {
        try {
          const ctx = hapticContext.initContext();
          if (ctx && ctx.state === "suspended") {
            ctx.resume();
          }
          
          // Create a short silent oscillation that triggers haptic on iOS
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          // Silent but triggers haptic engine
          gainNode.gain.value = 0.001;
          oscillator.frequency.value = 1;
          
          const duration = typeof vibrationPatterns[type] === "number" 
            ? vibrationPatterns[type] / 1000 
            : 0.01;
          
          oscillator.start();
          oscillator.stop(ctx.currentTime + duration);
        } catch {
          // iOS haptic fallback failed silently
        }
      }
    },
    [settings.hapticFeedback]
  );

  // Initialize haptic context on first user interaction (required for iOS)
  const initHaptics = useCallback(() => {
    hapticContext.initContext();
  }, []);

  return {
    triggerHaptic,
    initHaptics,
  };
}
