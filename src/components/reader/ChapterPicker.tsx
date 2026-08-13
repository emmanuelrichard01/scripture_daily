import { useEffect, useRef } from "react";
import { CircleDot } from "lucide-react";
import {
  chapterAtPosition,
  type ReadingList,
} from "@/lib/readingPlan";
import { cn } from "@/lib/utils";

interface ChapterPickerProps {
  list: ReadingList;
  /** Position currently on screen, 1-based within the list's cycle. */
  position: number;
  /** Position of today's assigned chapter, so it can be marked. */
  homePosition: number | null;
  onSelect: (position: number) => void;
}

/**
 * Jump to any chapter in the current list.
 *
 * Stepping one chapter at a time is fine for reading forward but useless for
 * "what did I read last week" or "let me look at Genesis 1 again". The grid
 * shows the whole list at once and marks two positions: where you are, and
 * where today's reading sits — the second is what makes it safe to wander,
 * because the way back is always visible.
 */
export function ChapterPicker({
  list,
  position,
  homePosition,
  onSelect,
}: ChapterPickerProps) {
  const currentRef = useRef<HTMLButtonElement>(null);

  /*
   * The Prophets list is 250 chapters over 17 books; opening at the top would
   * mean scrolling to find where you are.
   *
   * Done by hand rather than with `scrollIntoView`, which scrolls *every*
   * scrollable ancestor. The reader's drawer is `overflow-hidden` — still a
   * scroll container — so letting the browser walk up the tree pulled the
   * chapter text off screen behind the sheet.
   */
  useEffect(() => {
    const target = currentRef.current;
    const scroller = target?.closest<HTMLElement>("[data-reader-scroll]");
    if (!target || !scroller) return;

    const offset =
      target.offsetTop - scroller.clientHeight / 2 + target.offsetHeight / 2;
    scroller.scrollTop = Math.max(0, offset);
  }, []);

  const current = chapterAtPosition(list, position);

  let offset = 0;

  return (
    <div className="space-y-5">
      {list.books.map((book) => {
        const bookOffset = offset;
        offset += book.chapters;

        return (
          <section key={book.name}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3
                className={cn(
                  "text-xs font-bold",
                  book.name === current.book ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {book.name}
              </h3>
              <span className="text-2xs tabular-nums text-muted-foreground">
                {book.chapters}
              </span>
            </div>

            {/*
              Sized by cell, not by column count. A fixed `grid-cols-8` gave
              ~40px targets on a phone and 160px slabs on a desktop drawer;
              auto-fill keeps every cell a thumb-sized square at any width.
            */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
              {Array.from({ length: book.chapters }, (_, index) => {
                const chapterPosition = bookOffset + index + 1;
                const isCurrent = chapterPosition === position;
                const isHome = chapterPosition === homePosition;

                return (
                  <button
                    key={chapterPosition}
                    ref={isCurrent ? currentRef : undefined}
                    type="button"
                    onClick={() => onSelect(chapterPosition)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`${book.name} ${index + 1}${isHome ? ", today's chapter" : ""}`}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-colors focus-ring",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {index + 1}
                    {isHome && !isCurrent && (
                      <CircleDot
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
