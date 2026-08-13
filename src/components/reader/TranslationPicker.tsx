import { Check } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { TRANSLATIONS, type TranslationId } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface TranslationPickerProps {
  /** Called after a choice is made, so the host can dismiss the sheet. */
  onSelected?: (translation: TranslationId) => void;
}

/**
 * The app's primary translation control.
 *
 * Translation used to live only in Settings, three taps away from the text it
 * governs, described as "used in the in-app reader" — which is precisely where
 * it should have been in the first place. Switching translation is a *reading*
 * decision, usually made mid-chapter when a verse reads oddly, so it belongs
 * beside the verse.
 *
 * Each option carries its full name, its place on the literal ↔ readable
 * spectrum, and its year, because "NASB" and "LSB" mean nothing to most readers
 * and a bare grid of acronyms makes the choice arbitrary.
 */
export function TranslationPicker({ onSelected }: TranslationPickerProps) {
  const { settings, updateSettings } = useSettings();

  const choose = (id: TranslationId) => {
    updateSettings({ translation: id });
    onSelected?.(id);
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-1.5" role="radiogroup" aria-label="Bible translation">
        {TRANSLATIONS.map((option) => {
          const isActive = settings.translation === option.id;

          return (
            <li key={option.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => choose(option.id)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-2xl border p-3 text-left transition-colors focus-ring",
                  isActive
                    ? "border-primary/40 bg-primary/[0.07]"
                    : "border-border/60 hover:bg-secondary/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold tracking-tight",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {option.id}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{option.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {option.style}
                    <span aria-hidden="true"> · </span>
                    {option.year}
                  </span>
                </span>

                {isActive && (
                  <Check
                    className="h-4.5 w-4.5 shrink-0 text-primary"
                    strokeWidth={2.75}
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="rounded-xl bg-secondary/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        Horner suggests staying in one translation for a whole cycle, so its
        phrasing settles into memory. Switching here changes every chapter you
        read, on every device.
      </p>
    </div>
  );
}
