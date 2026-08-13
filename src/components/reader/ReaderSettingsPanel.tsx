import { Copy, Minus, Plus, Share2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 26;

const LINE_HEIGHTS = [
  { label: "Snug", value: 1.5 },
  { label: "Normal", value: 1.75 },
  { label: "Airy", value: 2 },
] as const;

const MARGINS = [
  { label: "Narrow", value: "narrow" },
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "wide" },
] as const;

interface ReaderSettingsPanelProps {
  /** Reference of the chapter on screen, for the chapter-level actions. */
  reference: string;
  onCopyChapter: () => void;
  onShareChapter: () => void;
}

/**
 * Typography and whole-chapter actions.
 *
 * Translation used to live here behind a `Type` icon, which put a content
 * decision inside a formatting menu. It now has its own control in the header;
 * this panel is purely about how the page looks and what you can do with it.
 */
export function ReaderSettingsPanel({
  reference,
  onCopyChapter,
  onShareChapter,
}: ReaderSettingsPanelProps) {
  const { settings, updateTypography } = useSettings();
  const { typography } = settings;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="section-label">Text size</span>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {typography.fontSize}px
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-secondary/70 p-1">
          <button
            type="button"
            disabled={typography.fontSize <= FONT_SIZE_MIN}
            onClick={() => updateTypography({ fontSize: typography.fontSize - 1 })}
            className="rounded-lg p-2.5 transition-colors hover:bg-background disabled:opacity-30 focus-ring"
            aria-label="Decrease text size"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* A live preview at the chosen size is more legible than a number. */}
          <span
            className={cn(
              "flex-1 text-center leading-none text-muted-foreground",
              typography.fontFamily === "serif" ? "font-serif" : "font-sans",
            )}
            style={{ fontSize: `${typography.fontSize}px` }}
            aria-hidden="true"
          >
            Aa
          </span>

          <button
            type="button"
            disabled={typography.fontSize >= FONT_SIZE_MAX}
            onClick={() => updateTypography({ fontSize: typography.fontSize + 1 })}
            className="rounded-lg p-2.5 transition-colors hover:bg-background disabled:opacity-30 focus-ring"
            aria-label="Increase text size"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <span className="section-label">Typeface</span>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1">
          {(
            [
              { id: "serif", label: "Serif", css: "Georgia, serif" },
              { id: "sans", label: "Sans", css: "'Plus Jakarta Sans', sans-serif" },
            ] as const
          ).map((face) => (
            <button
              key={face.id}
              type="button"
              onClick={() => updateTypography({ fontFamily: face.id })}
              style={{ fontFamily: face.css }}
              className={cn(
                "rounded-lg py-2.5 text-sm transition-all focus-ring",
                typography.fontFamily === face.id
                  ? "bg-background font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {face.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <span className="section-label">Line spacing</span>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/70 p-1">
          {LINE_HEIGHTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateTypography({ lineHeight: option.value })}
              className={cn(
                "rounded-lg py-2.5 text-xs transition-all focus-ring",
                typography.lineHeight === option.value
                  ? "bg-background font-semibold shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <span className="section-label">Margins</span>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/70 p-1">
          {MARGINS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateTypography({ margin: option.value })}
              className={cn(
                "rounded-lg py-2.5 text-xs transition-all focus-ring",
                typography.margin === option.value
                  ? "bg-background font-semibold shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <span className="section-label">{reference}</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCopyChapter}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary/70 py-3 text-xs font-semibold transition-colors hover:bg-secondary focus-ring"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy chapter
          </button>
          <button
            type="button"
            onClick={onShareChapter}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary/70 py-3 text-xs font-semibold transition-colors hover:bg-secondary focus-ring"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share chapter
          </button>
        </div>
      </section>
    </div>
  );
}
