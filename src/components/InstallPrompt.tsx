import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/useHaptics";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { triggerHaptic, initHaptics } = useHaptics();

  useEffect(() => {
    // Initialize haptics on component mount (requires user gesture context)
    initHaptics();

    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS (iPhone, iPad, iPod)
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(iOS);

    // Check if dismissed recently
    const dismissed = localStorage.getItem("install-prompt-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for install prompt (Android/Desktop Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show after a delay
      setTimeout(() => {
        setShowPrompt(true);
        triggerHaptic("light");
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show iOS prompt after delay if not installed and on iOS
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [initHaptics, triggerHaptic]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    triggerHaptic("medium");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      triggerHaptic("success");
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
    triggerHaptic("light");
  };

  const handleShowIOSGuide = () => {
    setShowIOSGuide(true);
    triggerHaptic("light");
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Main install prompt */}
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="max-w-lg mx-auto card-elevated p-4 border-track-blue/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-track-blue/20 to-track-purple/20 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground mb-0.5">
                Install Scripture Daily
              </h3>
              <p className="text-2xs text-muted-foreground mb-3">
                {isIOS
                  ? "Add to your home screen for the best experience"
                  : "Install for offline access and quick launch"}
              </p>

              {isIOS ? (
                <Button
                  onClick={handleShowIOSGuide}
                  className="h-9 px-4 text-xs bg-foreground hover:bg-foreground/90 text-background rounded-xl gap-2"
                >
                  <Share className="w-3.5 h-3.5" />
                  Show me how
                </Button>
              ) : (
                <Button
                  onClick={handleInstall}
                  className="h-9 px-4 text-xs bg-foreground hover:bg-foreground/90 text-background rounded-xl"
                >
                  Install App
                </Button>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full overflow-hidden animate-slide-up">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Add to Home Screen
                </h3>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-track-blue/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-track-blue">
                    1
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Tap the <strong>Share</strong> button
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg">
                      <Share className="w-4 h-4 text-track-blue" />
                      <span className="text-xs text-muted-foreground">at the bottom of Safari</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-track-green/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-track-green">
                    2
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Scroll and tap <strong>"Add to Home Screen"</strong>
                    </p>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      You may need to scroll right in the share menu
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-track-purple/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-track-purple">
                    3
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      Tap <strong>"Add"</strong> in the top right
                    </p>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      Scripture Daily will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-xl bg-track-yellow/5 border border-track-yellow/10">
                <p className="text-2xs text-muted-foreground">
                  <span className="text-track-yellow font-medium">Tip:</span> The app works 
                  offline and will feel just like a native app!
                </p>
              </div>
            </div>

            <div className="p-4 bg-secondary/30 border-t border-border">
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full rounded-xl"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
