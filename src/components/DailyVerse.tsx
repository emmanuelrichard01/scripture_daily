import { useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { getDailyVerse, type DailyVerseItem } from "@/lib/dailyVerses";
import { toast } from "sonner";

interface DailyVerseProps {
  readingDay: number;
}

export function DailyVerse({ readingDay }: DailyVerseProps) {
  const [copied, setCopied] = useState(false);
  const verse: DailyVerseItem = useMemo(() => getDailyVerse(readingDay), [readingDay]);

  const handleCopy = async () => {
    try {
      const content = `"${verse.text}" — ${verse.reference}`;
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Verse copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy verse");
    }
  };

  const handleShare = async () => {
    const content = `"${verse.text}" — ${verse.reference}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Daily Scripture",
          text: content,
          url: window.location.origin,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        void handleCopy();
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <section
      aria-label="Daily Scripture"
      className="surface mb-6 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Daily Scripture · {verse.theme}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy verse"}
            aria-label="Copy verse"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Share verse"
            aria-label="Share verse"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <blockquote className="font-serif text-[1.05rem] sm:text-[1.12rem] italic leading-relaxed text-foreground/90">
        “{verse.text}”
      </blockquote>

      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        — {verse.reference}
      </p>
    </section>
  );
}

