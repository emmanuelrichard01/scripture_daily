import { useCallback, useState } from "react";
import { readRaw, removeRaw, StorageKeys, writeRaw } from "@/lib/storage";

/**
 * Whether the first-run walkthrough should be shown.
 *
 * Resolved synchronously from storage during the initial render. The previous
 * version deferred the decision behind a hardcoded 500ms `setTimeout` "to
 * prevent a flash", which just guaranteed a blank half-second on every single
 * cold start — including for returning users who would never see onboarding.
 */
export function useOnboarding() {
  const [state, setState] = useState(() => {
    const done =
      readRaw(StorageKeys.onboarding) === "true" ||
      readRaw(StorageKeys.legacyOnboarding) === "true";
    return { shouldShow: !done, isChecking: false };
  });

  const complete = useCallback(() => {
    writeRaw(StorageKeys.onboarding, "true");
    removeRaw(StorageKeys.legacyOnboarding);
    setState({ shouldShow: false, isChecking: false });
  }, []);

  /** Exposed through Settings so the walkthrough can be replayed. */
  const restart = useCallback(() => {
    removeRaw(StorageKeys.onboarding);
    removeRaw(StorageKeys.legacyOnboarding);
    setState({ shouldShow: true, isChecking: false });
  }, []);

  return { ...state, complete, restart };
}
