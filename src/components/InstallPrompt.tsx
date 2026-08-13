import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readRaw, StorageKeys, writeRaw } from "@/lib/storage";

/** The non-standard event Chromium fires when the app is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Show again this long after a dismissal rather than never. */
const SNOOZE_DAYS = 30;

/**
 * A dismissible prompt to install the PWA.
 *
 * Only appears on the Today route, and only once the browser says the app is
 * actually installable — a manual "add to home screen" banner shown to users who
 * already installed, or on a browser that cannot install, is pure noise.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    // Already running as an installed app — nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissedAt = Number(readRaw(StorageKeys.installPromptDismissed) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 86_400_000) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault(); // Suppress the browser's own mini-infobar.
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const onInstalled = () => setIsVisible(false);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    writeRaw(StorageKeys.installPromptDismissed, String(Date.now()));
    setIsVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setIsVisible(false);
    setInstallEvent(null);
  };

  if (!isVisible || pathname !== "/") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      className="fixed inset-x-4 bottom-[84px] z-40 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Download className="h-5 w-5" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="install-prompt-title" className="text-sm font-bold">
            Install Scripture Daily
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add it to your home screen for faster access and offline reading.
          </p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install} className="h-9 rounded-lg font-semibold">
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="h-9 rounded-lg text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary focus-ring"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
