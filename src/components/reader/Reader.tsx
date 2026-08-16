import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Type,
  WifiOff,
  X,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { ReaderSettingsPanel } from "@/components/reader/ReaderSettingsPanel";
import { TranslationPicker } from "@/components/reader/TranslationPicker";
import { ChapterPicker } from "@/components/reader/ChapterPicker";
import { VerseHighlightMenu } from "@/components/reader/VerseHighlightMenu";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useFeedback } from "@/hooks/useFeedback";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { translationInfo } from "@/contexts/SettingsContext";
import {
  chapterAtPosition,
  getList,
  positionOfChapter,
  type ChapterRef,
} from "@/lib/readingPlan";
import { BibleApiError, chapterQueryKey, fetchChapter, type Verse } from "@/lib/bible";
import {
  loadLocalHighlights,
  saveLocalHighlights,
  syncHighlightToCloud,
  deleteHighlightFromCloud,
  verseKey,
  HIGHLIGHT_PALETTE,
  type HighlightColor,
  type VerseHighlight,
} from "@/lib/highlights";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Which contained sheet is open, if any. */
type ActiveSheet = "translation" | "typography" | "chapters" | null;

const MARGIN_CLASS = {
  narrow: "px-4",
  normal: "px-6",
  wide: "px-9",
} as const;

/** A swipe must be this long, and this much more horizontal than vertical. */
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_RATIO = 1.6;

/** How far a pointer may travel, and how long it may rest, and still be a tap. */
const TAP_SLOP = 10;
const TAP_MAX_MS = 700;

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
  /**
   * The next list still unread today. When present, finishing this chapter
   * offers to carry straight on instead of dropping back to the list screen.
   */
  nextUp?: { listId: number; listName: string; book: string; chapter: number } | null;
  onAdvance?: (listId: number) => void;
}

/**
 * The in-app scripture reader.
 *
 * Four things drive the layout. Translation is a first-class header control
 * rather than a row buried in Settings, because switching translation is a
 * reading decision made mid-verse. The chapter reference is a button, so you
 * can jump anywhere in the list instead of stepping one chapter at a time. Only
 * the header hides while you read — the footer holds the one action the screen
 * exists to produce, and hiding it meant scrolling back up to mark a chapter
 * you had just finished. And verse taps yield to text selection, so selecting a
 * phrase no longer collapses into a verse highlight.
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
  nextUp,
  onAdvance,
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

  const { user } = useAuth();
  const timer = useReadingTimer(isOpen);

  const [position, setPosition] = useState(homePosition ?? 1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [highlights, setHighlights] = useState<VerseHighlight[]>(loadLocalHighlights);

  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pressStart = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    time: number;
  } | null>(null);

  // Reopening returns to today's chapter rather than wherever the last session
  // wandered off to.
  useEffect(() => {
    if (isOpen && homePosition !== null) setPosition(homePosition);
  }, [isOpen, homePosition]);

  // Keep local storage in sync whenever highlights change
  useEffect(() => {
    saveLocalHighlights(highlights);
  }, [highlights]);

  const current: ChapterRef | null = useMemo(
    () => (list ? chapterAtPosition(list, position) : null),
    [list, position],
  );

  const highlightsMap = useMemo(() => {
    const map = new Map<string, VerseHighlight>();
    for (const h of highlights) {
      map.set(verseKey(h.book, h.chapter, h.verse), h);
    }
    return map;
  }, [highlights]);

  const handleSetHighlight = useCallback(
    (color: HighlightColor) => {
      if (!current || selectedVerse === null) return;
      const now = new Date().toISOString();
      const key = verseKey(current.book, current.chapter, selectedVerse);
      const existing = highlightsMap.get(key);
      const updated: VerseHighlight = {
        id: existing?.id ?? crypto.randomUUID(),
        book: current.book,
        chapter: current.chapter,
        verse: selectedVerse,
        color,
        note: existing?.note ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      setHighlights((prev) =>
        prev
          .filter(
            (h) =>
              verseKey(h.book, h.chapter, h.verse) !==
              verseKey(current.book, current.chapter, selectedVerse),
          )
          .concat(updated),
      );

      if (user?.id) void syncHighlightToCloud(user.id, updated);
      setSelectedVerse(null);
    },
    [current, selectedVerse, highlightsMap, user],
  );

  const handleRemoveHighlight = useCallback(() => {
    if (!current || selectedVerse === null) return;
    setHighlights((prev) =>
      prev.filter(
        (h) =>
          verseKey(h.book, h.chapter, h.verse) !==
          verseKey(current.book, current.chapter, selectedVerse),
      ),
    );
    if (user?.id) {
      void deleteHighlightFromCloud(
        user.id,
        current.book,
        current.chapter,
        selectedVerse,
      );
    }
    setSelectedVerse(null);
  }, [current, selectedVerse, user]);

  const handleSaveNote = useCallback(
    (note: string | null) => {
      if (!current || selectedVerse === null) return;
      const now = new Date().toISOString();
      const key = verseKey(current.book, current.chapter, selectedVerse);
      const existing = highlightsMap.get(key);

      if (!existing && !note) return;

      const updated: VerseHighlight = {
        id: existing?.id ?? crypto.randomUUID(),
        book: current.book,
        chapter: current.chapter,
        verse: selectedVerse,
        color: existing?.color ?? "yellow",
        note,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      setHighlights((prev) =>
        prev
          .filter(
            (h) =>
              verseKey(h.book, h.chapter, h.verse) !==
              verseKey(current.book, current.chapter, selectedVerse),
          )
          .concat(updated),
      );

      if (user?.id) void syncHighlightToCloud(user.id, updated);
      setSelectedVerse(null);
    },
    [current, selectedVerse, highlightsMap, user],
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

  const resetView = useCallback(() => {
    setSelectedVerse(null);
    setIsImmersive(false);
    lastScrollTop.current = 0;
    viewportRef.current?.scrollTo({ top: 0 });
    setScrollProgress(0);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      feedback.haptic("light");
      setPosition(next);
      resetView();
    },
    [feedback, resetView],
  );

  // Changing translation re-renders a different text at the same reference;
  // scroll position from the old one is meaningless.
  useEffect(() => {
    resetView();
  }, [translation, resetView]);

  // Arrow keys are the natural affordance for paging, and the reader is a modal
  // surface so it can claim them unambiguously.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // A sheet is open and owns the keyboard.
      if (activeSheet !== null) return;

      if (event.key === "ArrowRight") goTo(position + 1);
      else if (event.key === "ArrowLeft") goTo(position - 1);
      else if (event.key === "Escape" && selectedVerse !== null) {
        event.stopPropagation();
        setSelectedVerse(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, position, goTo, selectedVerse, activeSheet]);

  /**
   * Tracks reading position and hides the header while scrolling down.
   *
   * The footer deliberately stays put. It carries "Mark as read" — the single
   * action the reader exists to produce — and hiding it meant finishing a
   * chapter and then having to scroll back up to record it.
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

  /** True while the reader has an active text selection. */
  const hasTextSelection = () => {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed);
  };

  /**
   * Whether the gesture that produced a click was a tap rather than a drag.
   *
   * Selection state alone is not a reliable discriminator: a `Selection` can
   * report `isCollapsed === false` while `toString()` is empty, and browsers
   * differ on whether the selection survives to the click. Measuring the
   * pointer is unambiguous — a drag to select text moves; a tap does not.
   */
  const wasTap = () => {
    const press = pressStart.current;
    if (!press) return true; // Keyboard or synthetic activation.

    const moved = Math.hypot(
      press.lastX - press.x,
      press.lastY - press.y,
    );
    return moved < TAP_SLOP && Date.now() - press.time < TAP_MAX_MS;
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    pressStart.current = {
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      time: Date.now(),
    };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const press = pressStart.current;
    if (!press) return;
    press.lastX = event.clientX;
    press.lastY = event.clientY;
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || activeSheet !== null) return;
    // Dragging to select text ends as a horizontal gesture too; paging away
    // from a selection the reader just made would be maddening.
    if (hasTextSelection()) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) {
      return;
    }

    goTo(position + (dx < 0 ? 1 : -1));
  };

  const handleMarkRead = () => {
    if (!isCompleted) {
      feedback.chapterComplete();
      if (timer.seconds >= 10) {
        toast.success(`Chapter finished in ${timer.formatted}`);
      }
    }
    onToggleComplete();
  };

  const reference = current ? `${current.book} ${current.chapter}` : "";
  const translationMeta = translationInfo(translation);

  /** The whole chapter as plain text, verse numbers inline. */
  const chapterText = (source: readonly Verse[]) =>
    `${reference} (${translation})\n\n${source
      .map((verse) => `${verse.verse}. ${stripTags(verse.text)}`)
      .join("\n")}`;

  const copyText = async (payload: string, success: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      feedback.haptic("light");
      toast.success(success);
    } catch {
      toast.error("Your browser blocked clipboard access");
    }
  };

  const shareText = async (payload: string) => {
    try {
      if (navigator.share) await navigator.share({ text: payload });
      else {
        await navigator.clipboard.writeText(payload);
        toast.success("Copied to your clipboard");
      }
    } catch (shareError) {
      // Dismissing the share sheet is not a failure.
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      toast.error("Couldn't share that");
    }
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
  const selected = verses?.find((verse) => verse.verse === selectedVerse) ?? null;

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
          <div className="mx-auto flex h-16 max-w-2xl items-center gap-1 px-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
              aria-label="Close reader"
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            {/* Reference stepper. The label is a button because paging one
                chapter at a time cannot answer "take me back to Genesis 1". */}
            <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => goTo(position - 1)}
                className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                aria-label={`Previous chapter, ${previous.book} ${previous.chapter}`}
              >
                <ChevronLeft className="h-4.5 w-4.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSheet("chapters")}
                className="min-w-0 rounded-lg px-1.5 py-1 text-center transition-colors hover:bg-secondary focus-ring"
                aria-haspopup="dialog"
              >
                <span className="block truncate font-display text-base font-semibold leading-tight tracking-tight">
                  {reference}
                </span>
                <span className="mt-0.5 block truncate text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {isOnTodaysChapter ? listName : `${listName} · browsing`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => goTo(position + 1)}
                className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                aria-label={`Next chapter, ${next.book} ${next.chapter}`}
              >
                <ChevronRight className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>

            {/* Reading timer badge */}
            {timer.seconds >= 8 && (
              <span className="hidden sm:flex items-center gap-1 rounded-lg bg-secondary/70 px-2 py-1 text-2xs font-semibold text-muted-foreground tabular-nums">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {timer.formatted}
              </span>
            )}

            {/* Translation, promoted to the header. It shows the current choice
                at a glance, which the old typography-menu placement did not. */}
            <button
              type="button"
              onClick={() => setActiveSheet("translation")}
              className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-secondary/80 px-2.5 text-xs font-bold tracking-tight transition-colors hover:bg-secondary focus-ring"
              aria-haspopup="dialog"
              aria-label={`Translation: ${translationMeta.name}. Change translation`}
            >
              <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {translation}
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet("typography")}
              className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
              aria-haspopup="dialog"
              aria-label="Text appearance and chapter actions"
            >
              <Type className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          ref={viewportRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <div className={cn("mx-auto max-w-2xl pb-40 pt-8", MARGIN_CLASS[typography.margin])}>
            {isPending && (
              <div className="space-y-3.5" aria-hidden="true">
                {[97, 91, 99, 86, 94, 100, 88, 96, 92, 79].map((width, index) => (
                  <div
                    key={index}
                    className="skeleton h-5 rounded"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
                  aria-hidden="true"
                >
                  {isOffline ? (
                    <WifiOff className="h-6 w-6" />
                  ) : (
                    <RefreshCw className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-display text-base font-semibold text-foreground">
                    {isOffline ? "You're offline" : "Couldn't load scripture"}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">{errorMessage}</p>
                </div>
                <div className="flex gap-2">
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
                  {!isOffline && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSheet("translation")}
                      className="gap-2 rounded-xl"
                    >
                      <Languages className="h-4 w-4" aria-hidden="true" />
                      Try another translation
                    </Button>
                  )}
                </div>
              </div>
            )}

            {verses && (
              <>
                <div className="mb-7 text-center">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {reference}
                  </p>
                  <p className="mt-1 text-2xs font-medium text-muted-foreground/70">
                    {translationMeta.name}
                  </p>
                </div>

                <article
                  className={cn(
                    "text-pretty selection:bg-primary/20",
                    typography.fontFamily === "serif" ? "font-serif" : "font-sans",
                  )}
                  style={{
                    fontSize: `${typography.fontSize}px`,
                    lineHeight: typography.lineHeight,
                  }}
                >
                  {verses.map((verse) => {
                    const isSelected = selectedVerse === verse.verse;
                    const isFocusable = isSelected || (selectedVerse === null && verse.verse === 1);
                    const hlKey = verseKey(current.book, current.chapter, verse.verse);
                    const hl = highlightsMap.get(hlKey);
                    const hlPalette = hl ? HIGHLIGHT_PALETTE[hl.color] : null;

                    return (
                      <span
                        key={verse.verse}
                        role="button"
                        tabIndex={isFocusable ? 0 : -1}
                        onClick={() => {
                          // A drag to select text ends in a click on the last
                          // verse touched. Honouring it would wipe the
                          // selection the reader just made.
                          if (!wasTap() || hasTextSelection()) return;
                          setSelectedVerse(isSelected ? null : verse.verse);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            pressStart.current = null;
                            setSelectedVerse(isSelected ? null : verse.verse);
                          }
                        }}
                        className={cn(
                          "relative rounded-[4px] px-0.5 transition-colors duration-200",
                          isSelected
                            ? "bg-primary/20 ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                            : hlPalette
                              ? cn(hlPalette.bgClass, hlPalette.borderClass)
                              : "hover:bg-primary/[0.06] focus-visible:bg-primary/[0.08]",
                        )}
                        aria-label={`Verse ${verse.verse}`}
                        aria-pressed={isSelected}
                      >
                        <sup className="mr-1 select-none align-super font-sans text-[0.6em] font-bold text-primary">
                          {verse.verse}
                        </sup>
                        {/* Sanitised in fetchChapter: text plus <i>/<b>/<br>. */}
                        <span dangerouslySetInnerHTML={{ __html: verse.text }} />
                        {hl?.note && (
                          <span
                            className="ml-1 inline-flex items-center align-middle text-primary"
                            title={`Note: ${hl.note}`}
                          >
                            <MessageSquare className="h-3 w-3 inline opacity-80" aria-hidden="true" />
                          </span>
                        )}{" "}
                      </span>
                    );
                  })}
                </article>

                {/* End-of-chapter paging */}
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

        {/* Verse actions popover menu */}
        {selected && current && (
          <div className="absolute inset-x-0 bottom-0 z-30 mb-[4.75rem] px-4 animate-slide-up">
            <div className="mx-auto max-w-md">
              <VerseHighlightMenu
                book={current.book}
                chapter={current.chapter}
                verse={selected.verse}
                verseText={stripTags(selected.text)}
                currentHighlight={
                  highlightsMap.get(verseKey(current.book, current.chapter, selected.verse)) ?? null
                }
                onSetColor={handleSetHighlight}
                onRemoveHighlight={handleRemoveHighlight}
                onSaveNote={handleSaveNote}
                onClose={() => setSelectedVerse(null)}
              />
            </div>
          </div>
        )}

        <footer className="glass safe-bottom absolute inset-x-0 bottom-0 z-20 border-t border-border/50">
          <div className="mx-auto max-w-2xl p-4">
            {!isOnTodaysChapter ? (
              // Browsing away from today's chapter: offer the way back rather
              // than a Mark button that would credit the wrong chapter.
              <Button
                variant="outline"
                onClick={() => goTo(homePosition ?? 1)}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                Back to today's chapter
              </Button>
            ) : isCompleted && nextUp && onAdvance ? (
              // Finished, and there is more to read today. Carrying straight on
              // beats closing the reader and hunting for the next card.
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleMarkRead}
                  className="h-13 shrink-0 gap-2 rounded-2xl px-4 font-semibold"
                  aria-label="Undo mark as read"
                >
                  <Check className="h-5 w-5 text-success" aria-hidden="true" />
                </Button>
                <Button
                  onClick={() => onAdvance(nextUp.listId)}
                  className="h-13 min-w-0 flex-1 justify-between gap-2 rounded-2xl px-4 text-left shadow-md"
                >
                  <span className="min-w-0">
                    <span className="block text-2xs font-bold uppercase tracking-[0.08em] opacity-75">
                      Next · {nextUp.listName}
                    </span>
                    <span className="block truncate font-display text-sm font-semibold">
                      {nextUp.book} {nextUp.chapter}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                </Button>
              </div>
            ) : (
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
            )}
          </div>
        </footer>

        <ReaderSheet
          open={activeSheet === "translation"}
          onClose={() => setActiveSheet(null)}
          title="Translation"
          description="Applies to every chapter you read."
        >
          <TranslationPicker onSelected={() => setActiveSheet(null)} />
        </ReaderSheet>

        <ReaderSheet
          open={activeSheet === "typography"}
          onClose={() => setActiveSheet(null)}
          title="Appearance"
        >
          <ReaderSettingsPanel
            reference={reference}
            onCopyChapter={() => {
              if (!verses) return;
              setActiveSheet(null);
              void copyText(chapterText(verses), `${reference} copied`);
            }}
            onShareChapter={() => {
              if (!verses) return;
              setActiveSheet(null);
              void shareText(chapterText(verses));
            }}
          />
        </ReaderSheet>

        <ReaderSheet
          open={activeSheet === "chapters"}
          onClose={() => setActiveSheet(null)}
          title={listName}
          description={`${list.totalChapters} chapters in this list. Today's reading is marked.`}
        >
          <ChapterPicker
            list={list}
            position={position}
            homePosition={homePosition}
            onSelect={(next) => {
              setActiveSheet(null);
              goTo(next);
            }}
          />
        </ReaderSheet>
      </DrawerContent>
    </Drawer>
  );
}

/** Verse markup is a tiny allowlisted subset, so a regex is sufficient here. */
function stripTags(html: string): string {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
