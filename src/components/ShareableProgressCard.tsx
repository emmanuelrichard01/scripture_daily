import { useRef, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMediumDate, todayISO } from "@/lib/date";
import { toast } from "sonner";

interface ShareableProgressCardProps {
  streak: number;
  totalChapters: number;
  activeDays: number;
  onClose: () => void;
}

/**
 * Renders the reader's stats to an image they can share.
 *
 * html2canvas is imported dynamically — it is ~200KB and is only needed at the
 * moment someone actually taps share, not on every visit to History.
 */
export function ShareableProgressCard({
  streak,
  totalChapters,
  activeDays,
  onClose,
}: ShareableProgressCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const toBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 2, // Retina-sharp when viewed on a phone.
      backgroundColor: null,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const handleShare = async () => {
    setIsRendering(true);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("Could not render the card");

      const file = new File([blob], "scripture-daily.png", { type: "image/png" });

      // Prefer the native share sheet, but only when it accepts files — Safari
      // reports `share` while rejecting file payloads.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Scripture Daily progress" });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scripture-daily-progress.png";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Image saved");
    } catch (error) {
      // A user dismissing the share sheet is not a failure worth reporting.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't create the image");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/90 p-6 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-ring safe-area-top"
        aria-label="Close"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <h2 id="share-card-title" className="sr-only">
        Share your progress
      </h2>

      <div
        ref={cardRef}
        className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-track-purple p-7 text-white shadow-2xl"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">
          Scripture Daily
        </p>

        <p className="mt-6 font-heading text-5xl font-bold tabular-nums leading-none">
          {totalChapters.toLocaleString()}
        </p>
        <p className="mt-1.5 text-sm font-medium opacity-80">chapters read</p>

        <div className="mt-7 flex gap-6 border-t border-white/20 pt-5">
          <div>
            <p className="font-heading text-2xl font-bold tabular-nums leading-none">
              {streak}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-70">
              Best streak
            </p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold tabular-nums leading-none">
              {activeDays}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-70">
              Days read
            </p>
          </div>
        </div>

        <p className="mt-6 text-[10px] font-medium opacity-60">
          Horner's 10-list system · {formatMediumDate(todayISO())}
        </p>
      </div>

      <Button
        onClick={handleShare}
        disabled={isRendering}
        className="h-12 w-full max-w-[320px] gap-2 rounded-xl font-semibold"
      >
        {isRendering ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : typeof navigator !== "undefined" && "share" in navigator ? (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {isRendering ? "Preparing…" : "Share"}
      </Button>
    </div>
  );
}
