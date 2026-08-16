import { useMemo, useState } from "react";
import { Copy, Check, Quote, Share2, Sparkles } from "lucide-react";
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
      aria-label="Daily Scripture Inspiration"
      className="surface relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-card to-card p-5 transition-all hover:border-primary/30"
    >
      {/* Soft warm background aura */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="text-2xs font-bold uppercase tracking-[0.09em] text-primary">
            Daily Scripture · {verse.theme}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy verse"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
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
            aria-label="Share verse"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative pl-1">
        <Quote
          className="pointer-events-none absolute -left-2 -top-1 h-6 w-6 text-primary/15"
          aria-hidden="true"
        />
        <blockquote className="font-serif text-[0.9375rem] font-medium italic leading-relaxed text-foreground/90 sm:text-base">
          "{verse.text}"
        </blockquote>
        <p className="mt-2 text-xs font-bold tracking-wide text-primary">
          — {verse.reference}
        </p>
      </div>
    </section>
  );
}
