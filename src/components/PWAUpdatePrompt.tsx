import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Offers a reload when a new build is waiting.
 *
 * Never reloads on its own: the user could be mid-chapter, and a service worker
 * update is not urgent enough to interrupt reading.
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    toast("A new version is ready", {
      description: "Reload to get the latest improvements.",
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => {
          setNeedRefresh(false);
          void updateServiceWorker(true);
        },
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
