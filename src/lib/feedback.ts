/**
 * Audio and vibration feedback.
 *
 * A single lazily-created `AudioContext` is shared process-wide. The previous
 * hook created one per mounting component and closed it on unmount — with
 * Today, Lists and the Reader all mounted, that was three contexts against a
 * browser limit of roughly six, and closing one on navigation silenced the
 * others' pending nodes.
 *
 * The context is created on first *use* rather than on import, because browsers
 * start it suspended unless construction follows a user gesture.
 */

let audioContext: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;

  if (!Ctor) return null;

  try {
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/** Resumes the shared context. Safe to call on every gesture. */
function resume(context: AudioContext): void {
  if (context.state === "suspended") void context.resume();
}

/** A short, soft confirmation tone for marking one chapter read. */
export function playChime(): void {
  const context = getAudioContext();
  if (!context) return;
  resume(context);

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.09);

  // Ramp rather than a step, so the tone does not click on start or stop.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

/** A resolved major chord for finishing all ten chapters. */
export function playCompletionChord(): void {
  const context = getAudioContext();
  if (!context) return;
  resume(context);

  const now = context.currentTime;
  // A4, C#5, E5 — a bright major triad, arpeggiated slightly.
  const voices = [440, 554.37, 659.25];

  voices.forEach((frequency, index) => {
    const start = now + index * 0.08;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 1.35);
  });
}

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 24,
  heavy: 48,
  success: [12, 44, 12],
  warning: [24, 48, 24],
  error: [48, 32, 48],
};

/**
 * Fires a vibration pattern where supported.
 *
 * iOS Safari does not implement `navigator.vibrate` at all. The old code tried
 * to fake it with an inaudible oscillator, which does nothing on iOS and only
 * burned an audio node per tap — so that path is gone. On iOS the visual and
 * audio feedback carry the interaction instead.
 */
export function vibrate(pattern: HapticPattern = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(VIBRATION_PATTERNS[pattern]);
  } catch {
    // Blocked by a permissions policy; nothing to recover.
  }
}
