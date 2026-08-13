import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional line under the title, for context the list alone can't carry. */
  description?: string;
  children: ReactNode;
}

/**
 * A bottom sheet that lives *inside* the reader rather than in a portal.
 *
 * The reader is itself a Vaul drawer. Nesting a second drawer inside it means
 * two components competing for the same drag gestures and scroll locks, and the
 * inner one inherits the outer one's `94dvh` height — so a translation list
 * would open nearly full-screen over the text it is meant to preview. Rendering
 * the sheet within the reader's own stacking context keeps the chapter visible
 * behind it and leaves gesture handling to one owner.
 */
export function ReaderSheet({
  open,
  onClose,
  title,
  description,
  children,
}: ReaderSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /*
   * Callers pass `onClose` as an inline arrow, so its identity changes on every
   * render. Depending on it directly made the effect below tear down and re-run
   * continuously — restoring focus and re-taking it on each pass, which churns
   * focus events for as long as the sheet is open. Held in a ref so the effect
   * depends only on `open`, which is what actually changes.
   */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    /*
     * Focus the panel so Escape reaches it and screen readers announce it,
     * without stealing focus into whichever control happens to be first.
     *
     * `preventScroll` is essential, not a nicety. The reader's drawer is
     * `overflow-hidden`, which still leaves it *scrollable* — so the default
     * scroll-into-view shunted the drawer's own content up by ~540px to reveal
     * a panel that was already in view, dragging the header and the chapter off
     * screen and leaving what looked like a broken, half-empty sheet.
     */
    panelRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Claim Escape before the reader drawer does, or dismissing the picker
      // would close the whole reader.
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
    };

    // Capture phase for the same reason.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40" role="presentation">
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title.toLowerCase()}`}
        className="absolute inset-0 h-full w-full cursor-default bg-foreground/25 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "safe-bottom absolute inset-x-0 bottom-0 max-h-[78%] overflow-hidden rounded-t-3xl",
          "border-t border-border bg-background shadow-xl animate-slide-up outline-none",
        )}
      >
        {/* Matched to the reader's own text column, so a sheet does not sprawl
            across a desktop-width drawer. */}
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3 border-b border-border/60 px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold leading-tight">{title}</h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 -mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
            aria-label={`Close ${title.toLowerCase()}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/*
          `relative` makes this the offsetParent for its contents, which is what
          lets the chapter picker scroll a selected chapter into view by
          arithmetic instead of `scrollIntoView`.
        */}
        <div
          data-reader-scroll=""
          className="relative max-h-[calc(78dvh-5rem)] overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto max-w-2xl px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
