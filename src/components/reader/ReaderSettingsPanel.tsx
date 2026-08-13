import { Minus, Plus } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { TRANSLATIONS } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 24;

const LINE_HEIGHTS = [
  { label: "Snug", value: 1.5 },
  { label: "Normal", value: 1.75 },
  { label: "Airy", value: 2 },
] as const;

/**
 * Typography and translation controls for the reader.
 *
 * Split out of `Reader` because the reader is already the most complex
 * component in the app, and these controls are self-contained — they read and
 * write settings directly rather than being threaded through props.
 */
export function ReaderSettingsPanel() {
  const { settings, updateSettings, updateTypography } = useSettings();
  const { typography, translation } = settings;

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
            className="rounded-lg p-2 transition-colors hover:bg-background disabled:opacity-30 focus-ring"
            aria-label="Decrease text size"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* A live preview at the chosen size is more legible than a number. */}
          <span
            className="flex-1 text-center leading-none text-muted-foreground"
            style={{ fontSize: `${typography.fontSize}px` }}
            aria-hidden="true"
          >
            Aa
          </span>

          <button
            type="button"
            disabled={typography.fontSize >= FONT_SIZE_MAX}
            onClick={() => updateTypography({ fontSize: typography.fontSize + 1 })}
            className="rounded-lg p-2 transition-colors hover:bg-background disabled:opacity-30 focus-ring"
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
                "rounded-lg py-2 text-sm transition-all focus-ring",
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
                "rounded-lg py-2 text-xs font-medium transition-all focus-ring",
                typography.lineHeight === option.value
                  ? "bg-background font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <span className="section-label">Translation</span>
        {/* A grid rather than a select: seven options fit, and seeing them all
            at once beats opening a menu to compare. */}
        <div className="grid grid-cols-4 gap-1.5">
          {TRANSLATIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateSettings({ translation: option.id })}
              title={option.name}
              className={cn(
                "rounded-lg py-2 text-xs font-bold transition-all focus-ring",
                translation === option.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {option.id}
            </button>
          ))}
        </div>
        <p className="pt-0.5 text-2xs leading-relaxed text-muted-foreground">
          Horner suggests staying in one translation for a whole cycle so its
          phrasing settles into memory.
        </p>
      </section>
    </div>
  );
}
