import { useRef, useState } from "react";
import { Copy, Download, Loader2, Share2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMediumDate, todayISO } from "@/lib/date";
import { TOTAL_PLAN_CHAPTERS } from "@/lib/readingPlan";
import { toast } from "sonner";

interface ShareableProgressCardProps {
  streak: number;
  currentStreak?: number;
  totalChapters: number;
  activeDays: number;
  onClose: () => void;
}

/**
 * Renders the reader's stats to a clean editorial image and provides 1-tap text summary copy.
 */
export function ShareableProgressCard({
  streak,
  currentStreak = 0,
  totalChapters,
  activeDays,
  onClose,
}: ShareableProgressCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  const biblesRead = totalChapters / TOTAL_PLAN_CHAPTERS;
  const today = todayISO();
  const dateFormatted = formatMediumDate(today);

  const toBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 2, // Retina-sharp when viewed on a phone.
      backgroundColor: "#18181b",
      logging: false,
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const handleShareImage = async () => {
    setIsRendering(true);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("Could not render the card");

      const file = new File([blob], "scripture-daily-progress.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My Scripture Daily Progress",
          text: `I've read ${totalChapters.toLocaleString()} chapters on Scripture Daily!`,
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "scripture-daily-progress.png";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't create the image");
    } finally {
      setIsRendering(false);
    }
  };

  const handleCopyText = async () => {
    const text = [
      `📖 My Scripture Daily Progress (${dateFormatted})`,
      `• Chapters Read: ${totalChapters.toLocaleString()} (${biblesRead.toFixed(2)}× Bible Pass)`,
      currentStreak > 0 ? `• Current Streak: ${currentStreak} days` : null,
      `• Best Streak: ${streak} days`,
      `• Active Days: ${activeDays} days`,
      `\nReading through the 10-Track Horner System.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Progress summary copied to clipboard");
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-card-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background/90 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-ring safe-area-top cursor-pointer"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <h2 id="share-card-title" className="sr-only">
        Share your progress
      </h2>

      {/* ── Editorial Share Card Canvas ── */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[340px] overflow-hidden rounded-3xl bg-[#18181b] p-6 text-[#fafafa] border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="Scripture Daily logo"
              className="h-6 w-6 rounded-md object-contain shadow-xs"
              crossOrigin="anonymous"
            />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-white/90">
              Scripture Daily
            </span>
          </div>
          <span className="text-[0.65rem] font-medium text-white/60 uppercase tracking-wider">
            {dateFormatted}
          </span>
        </div>

        {/* Main Headline Metric */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/60">
              Total Scripture Volume
            </span>
            {totalChapters > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold text-white/90">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                {biblesRead.toFixed(2)}× Bible pass
              </span>
            )}
          </div>

          <p className="font-display text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-white">
            {totalChapters.toLocaleString()}
            <span className="ml-2 text-sm font-sans font-normal text-white/60">
              chapters read
            </span>
          </p>
        </div>

        {/* 3-Pillar Stats Row */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 mb-5">
          <div>
            <p className="font-display text-xl font-bold text-white leading-none">
              {currentStreak > 0 ? currentStreak : streak}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/60">
              {currentStreak > 0 ? "Current" : "Best"} streak
            </p>
          </div>

          <div className="border-x border-white/10 px-2 text-center">
            <p className="font-display text-xl font-bold text-white leading-none">
              {streak}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/60">
              Best record
            </p>
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-bold text-white leading-none">
              {activeDays}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/60">
              Days active
            </p>
          </div>
        </div>

        {/* Footer info line */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[0.62rem] text-white/50">
          <span>10-Track Horner System</span>
          <span>scripturedaily.app</span>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex w-full max-w-[340px] flex-col gap-2">
        <Button
          onClick={handleShareImage}
          disabled={isRendering}
          className="h-11 w-full gap-2 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          {isRendering ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : typeof navigator !== "undefined" && "share" in navigator ? (
            <Share2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          {isRendering ? "Preparing…" : "Share image"}
        </Button>

        <Button
          variant="outline"
          onClick={handleCopyText}
          className="h-11 w-full gap-2 rounded-xl font-semibold cursor-pointer"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy text summary
        </Button>
      </div>
    </div>
  );
}

