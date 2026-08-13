import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Share2,
  Sparkles,
  Type,
  WifiOff,
  X,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReaderSettingsPanel } from "@/components/reader/ReaderSettingsPanel";
import { useSettings } from "@/hooks/useSettings";
import { useFeedback } from "@/hooks/useFeedback";
import {
  chapterAtPosition,
  getList,
  positionOfChapter,
  type ChapterRef,
} from "@/lib/readingPlan";
import { BibleApiError, chapterQueryKey, fetchChapter } from "@/lib/bible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReaderProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  listId: number;
  listName: string;
  /** The chapter today's reading points at. Navigation starts here. */
  book: string;
  chapter: number;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

/**
 * The in-app scripture reader.
 *
 * Beyond rendering text it does three things the previous version did not: it
 * lets you move through the list's sequence instead of stranding you on a
 * single chapter, it gets out of the way while you read, and it lets you act on
 * an individual verse.
 */
export function Reader({
  isOpen,
  onOpenChange,
  listId,
  listName,
  book,
  chapter,
  isCompleted,
  onToggleComplete,
}: ReaderProps) {
  const { settings } = useSettings();
  const feedback = useFeedback();
  const queryClient = useQueryClient();
  const { translation, typography } = settings;

  const list = getList(listId);

  /** Today's chapter, as a position — the origin navigation returns to. */
  const homePosition = useMemo(
    () => (list ? positionOfChapter(list, book, chapter) : null),
    [list, book, chapter],
  );

  const [position, setPosition] = useState(homePosition ?? 1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Reopening returns to today's chapter rather than wherever the last session
  // wandered off to.
  useEffect(() => {
    if (isOpen && homePosition !== null) setPosition(homePosition);
  }, [isOpen, homePosition]);

  const current: ChapterRef | null = useMemo(
    () => (list ? chapterAtPosition(list, position) : null),
    [list, position],
  );

  const isOnTodaysChapter = position === homePosition;

  const {
    data: verses,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: chapterQueryKey(translation, current?.book ?? "", current?.chapter ?? 0),
    queryFn: ({ signal }) =>
      fetchChapter(translation, current!.book, current!.chapter, signal),
    enabled: isOpen && Boolean(current),
    staleTime: Infinity, // Scripture is immutable.
  });

  // Warm the adjacent chapters so paging is instant. Cheap: a chapter is a few
  // KB, and the response is edge-cached and immutable.
  useEffect(() => {
    if (!isOpen || !list || !verses) return;

    for (const offset of [1, -1]) {
      const neighbour = chapterAtPosition(list, position + offset);
      void queryClient.prefetchQuery({
        queryKey: chapterQueryKey(translation, neighbour.book, neighbour.chapter),
        queryFn: ({ signal }) =>
          fetchChapter(translation, neighbour.book, neighbour.chapter, signal),
        staleTime: Infinity,
      });
    }
  }, [isOpen, list, position, translation, verses, queryClient]);

  const goTo = useCallback(
    (next: number) => {
      feedback.haptic("light");
      setPosition(next);
      setSelectedVerse(null);
      setIsImmersive(false);
      lastScrollTop.current = 0;
      viewportRef.current?.scrollTo({ top: 0 });
      setScrollProgress(0);
    },
    [feedback],
  );

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setScrollProgress(0);
  }, [translation]);

  // Arrow keys are the natural affordance for paging, and the reader is a modal
  // surface so it can claim them unambiguously.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight") goTo(position + 1);
      else if (event.key === "ArrowLeft") goTo(position - 1);
      else if (event.key === "Escape" && selectedVerse !== null) {
        event.stopPropagation();
        setSelectedVerse(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, position, goTo, selectedVerse]);

  /**
   * Tracks reading position and hides the chrome while scrolling down.
   *
   * The header and footer return the instant you scroll back up, so controls
   * are never more than a flick away — hiding them permanently would trade one
   * annoyance for another.
   */
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const scrollable = element.scrollHeight - element.clientHeight;
    setScrollProgress(scrollable > 0 ? element.scrollTop / scrollable : 0);

    const delta = element.scrollTop - lastScrollTop.current;
    if (Math.abs(delta) > 8) {
      setIsImmersive(delta > 0 && element.scrollTop > 120);
      lastScrollTop.current = element.scrollTop;
    }
  };

  const handleMarkRead = () => {
    if (!isCompleted) feedback.chapterComplete();
    onToggleComplete();
  };

  const reference = current ? `${current.book} ${current.chapter}` : "";

  /** Formats a verse for the clipboard or the share sheet. */
  const citationFor = (verseNumber: number, html: string) =>
    `"${html.replace(/<[^>]+>/g, "")}" — ${reference}:${verseNumber} (${translation})`;

  const copyVerse = async (verseNumber: number, html: string) => {
    try {
      await navigator.clipboard.writeText(citationFor(verseNumber, html));
      feedback.haptic("light");
      toast.success("Verse copied");
    } catch {
      toast.error("Your browser blocked clipboard access");
    }
    setSelectedVerse(null);
  };

  const shareVerse = async (verseNumber: number, html: string) => {
    const payload = citationFor(verseNumber, html);
    try {
      if (navigator.share) await navigator.share({ text: payload });
      else {
        await navigator.clipboard.writeText(payload);
        toast.success("Verse copied");
      }
    } catch (shareError) {
      // Dismissing the share sheet is not a failure.
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      toast.error("Couldn't share that verse");
    }
    setSelectedVerse(null);
  };

  const errorMessage =
    error instanceof BibleApiError
      ? error.message
      : error
        ? "Couldn't load this chapter."
        : null;
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (!list || !current) return null;

  const previous = chapterAtPosition(list, position - 1);
  const next = chapterAtPosition(list, position + 1);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-[94dvh] flex-col overflow-hidden border-t border-border bg-background p-0">
        <DrawerTitle className="sr-only">
          {reference} — {listName}
        </DrawerTitle>

        {/* Reading progress, as a hairline at the very top edge: informative
            without competing with the text. */}
        <div className="absolute inset-x-0 top-0 z-30 h-[3px]" aria-hidden="true">
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-linear"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>

        <header
          className={cn(
            "glass relative z-20 shrink-0 border-b border-border/50 transition-transform duration-300 ease-out-expo",
            isImmersive && "-translate-y-full",
          )}
        >
          <div className="mx-auto flex h-16 max-w-2xl items-center gap-1 px-3">
            <button
              type="button"
              onClick={() => goTo(position - 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
              aria-label={`Previous chapter, ${previous.book} ${previous.chapter}`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1 px-1 text-center">
              <p className="truncate font-display text-lg font-semibold tracking-tight">
                {reference}
              </p>
              <p className="truncate text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {isOnTodaysChapter ? listName : `${listName} · browsing`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => goTo(position + 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
              aria-label={`Next chapter, ${next.book} ${next.chapter}`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                  aria-label="Reading settings"
                >
                  <Type className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="z-[120] w-[19rem] rounded-2xl p-4 shadow-lg"
              >
                <ReaderSettingsPanel />
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
              aria-label="Close reader"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto max-w-2xl px-6 pb-40 pt-8">
            {isPending && (
              <div className="space-y-3.5" aria-hidden="true">
                {[97, 91, 99, 86, 94, 100, 88, 96, 92, 79].map((width, index) => (
                  <div key={index} className="skeleton h-5" style={{ width: `${width}%` }} />
                ))}
                <span className="sr-only">Loading chapter</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
                  aria-hidden="true"
                >
                  {isOffline ? <WifiOff className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
                </div>
                <p className="max-w-xs text-sm font-medium text-muted-foreground">
                  {errorMessage}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="gap-2 rounded-xl"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isFetching && "animate-spin")}
                    aria-hidden="true"
                  />
                  Try again
                </Button>
              </div>
            )}

            {verses && (
              <>
                <p className="mb-7 text-center font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {reference}
                </p>

                <article
                  className={cn(
                    "text-pretty",
                    typography.fontFamily === "serif" ? "font-serif" : "font-sans",
                  )}
                  style={{
                    fontSize: `${typography.fontSize}px`,
                    lineHeight: typography.lineHeight,
                  }}
                >
                  {verses.map((verse) => {
                    const isSelected = selectedVerse === verse.verse;

                    return (
                      <span key={verse.verse}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedVerse(isSelected ? null : verse.verse)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedVerse(isSelected ? null : verse.verse);
                            }
                          }}
                          className={cn(
                            "cursor-pointer rounded-[3px] transition-colors duration-200",
                            isSelected ? "bg-primary/15" : "hover:bg-primary/[0.06]",
                          )}
                          aria-label={`Verse ${verse.verse}`}
                          aria-pressed={isSelected}
                        >
                          <sup className="mr-1 select-none align-super font-sans text-[0.6em] font-bold text-primary">
                            {verse.verse}
                          </sup>
                          {/* Sanitised in fetchChapter: text plus <i>/<b> only. */}
                          <span dangerouslySetInnerHTML={{ __html: verse.text }} />
                        </span>{" "}
                        {isSelected && (
                          <span className="my-3 flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void copyVerse(verse.verse, verse.text)}
                              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 font-sans text-xs font-semibold transition-colors hover:bg-accent focus-ring"
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => void shareVerse(verse.verse, verse.text)}
                              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 font-sans text-xs font-semibold transition-colors hover:bg-accent focus-ring"
                            >
                              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Share
                            </button>
                          </span>
                        )}
                      </span>
                    );
                  })}
                </article>

                {/* End-of-chapter paging, so finishing offers the obvious next
                    move without scrolling back up to the header. */}
                <nav
                  className="mt-12 flex items-center justify-between gap-3 border-t border-border/60 pt-5"
                  aria-label="Chapter navigation"
                >
                  <button
                    type="button"
                    onClick={() => goTo(position - 1)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                  >
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {previous.book} {previous.chapter}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo(position + 1)}
                    className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-xl p-2 text-right text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                  >
                    <span className="truncate">
                      {next.book} {next.chapter}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                </nav>
              </>
            )}
          </div>
        </div>

        <footer
          className={cn(
            "glass safe-bottom absolute inset-x-0 bottom-0 z-20 border-t border-border/50 transition-transform duration-300 ease-out-expo",
            isImmersive && "translate-y-full",
          )}
        >
          <div className="mx-auto max-w-2xl p-4">
            {isOnTodaysChapter ? (
              <Button
                onClick={handleMarkRead}
                variant={isCompleted ? "secondary" : "default"}
                className={cn(
                  "h-13 w-full gap-2 rounded-2xl text-base font-bold transition-transform active:scale-[0.98]",
                  !isCompleted && "shadow-md",
                )}
              >
                {isCompleted ? (
                  <>
                    <Check className="h-5 w-5 text-success" aria-hidden="true" />
                    Marked as read
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Mark as read
                  </>
                )}
              </Button>
            ) : (
              // Browsing away from today's chapter: offer the way back rather
              // than a Mark button that would credit the wrong chapter.
              <Button
                variant="outline"
                onClick={() => goTo(homePosition ?? 1)}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                Back to today's chapter
              </Button>
            )}
          </div>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
