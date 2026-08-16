import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Copy,
  Highlighter,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HIGHLIGHT_PALETTE,
  loadLocalHighlights,
  saveLocalHighlights,
  type HighlightColor,
  type VerseHighlight,
} from "@/lib/highlights";
import { useAuth } from "@/hooks/useAuth";
import { deleteHighlightFromCloud } from "@/lib/highlights";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Highlights() {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<VerseHighlight[]>(loadLocalHighlights);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<HighlightColor | "all">("all");
  const [selectedBook, setSelectedBook] = useState<string>("all");

  const booksWithHighlights = useMemo(() => {
    const set = new Set<string>();
    for (const h of highlights) set.add(h.book);
    return Array.from(set).sort();
  }, [highlights]);

  const filteredHighlights = useMemo(() => {
    return highlights.filter((item) => {
      if (selectedColor !== "all" && item.color !== selectedColor) return false;
      if (selectedBook !== "all" && item.book !== selectedBook) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesRef = `${item.book} ${item.chapter}:${item.verse}`.toLowerCase().includes(query);
        const matchesNote = item.note?.toLowerCase().includes(query);
        return Boolean(matchesRef || matchesNote);
      }
      return true;
    });
  }, [highlights, selectedColor, selectedBook, searchQuery]);

  const handleRemove = (highlight: VerseHighlight) => {
    const next = highlights.filter((h) => h.id !== highlight.id);
    setHighlights(next);
    saveLocalHighlights(next);
    if (user?.id) {
      void deleteHighlightFromCloud(user.id, highlight.book, highlight.chapter, highlight.verse);
    }
    toast.success("Highlight removed");
  };

  const handleCopy = async (highlight: VerseHighlight) => {
    const ref = `${highlight.book} ${highlight.chapter}:${highlight.verse}`;
    const text = highlight.note ? `${ref} — Note: "${highlight.note}"` : ref;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <PageLayout
      title="Highlights & Notes"
      showBack
      description="All your highlighted scriptures and personal reflections in one place."
    >
      {/* ── Search & Filters ── */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by book, reference, or note..."
            className="h-11 rounded-2xl border-border/60 bg-card pl-11 shadow-sm"
          />
        </div>

        {/* Color filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedColor("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
              selectedColor === "all"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            All colors
          </button>
          {(Object.keys(HIGHLIGHT_PALETTE) as HighlightColor[]).map((color) => {
            const palette = HIGHLIGHT_PALETTE[color];
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
                  isSelected
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: palette.hex }}
                  aria-hidden="true"
                />
                {palette.name}
              </button>
            );
          })}
        </div>

        {/* Book filter dropdown if multiple books */}
        {booksWithHighlights.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Book:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBook("all")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-2xs font-bold transition-colors focus-ring",
                selectedBook === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            {booksWithHighlights.map((book) => (
              <button
                key={book}
                type="button"
                onClick={() => setSelectedBook(book)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-2xs font-bold transition-colors focus-ring",
                  selectedBook === book
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {book}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Highlights List ── */}
      {filteredHighlights.length > 0 ? (
        <ul className="space-y-3">
          {filteredHighlights.map((item) => {
            const palette = HIGHLIGHT_PALETTE[item.color];
            const reference = `${item.book} ${item.chapter}:${item.verse}`;
            return (
              <li
                key={item.id}
                className="surface overflow-hidden rounded-2xl p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: palette.hex }}
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {reference}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      aria-label="Copy reference and note"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      aria-label="Delete highlight"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {item.note ? (
                  <div className="rounded-xl bg-secondary/40 p-3 text-xs leading-relaxed text-foreground/90 border border-border/40">
                    <div className="flex items-center gap-1.5 text-2xs font-bold uppercase text-primary mb-1">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      Reflection Note
                    </div>
                    <p className="italic">{item.note}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Highlighted in {palette.name}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Highlighter
            className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-sm font-semibold">No highlights yet</p>
          <p className="mx-auto mt-1.5 max-w-[18rem] text-xs leading-relaxed text-muted-foreground">
            Tap any verse while reading in the app to highlight it in your favorite color or jot down a reflection note.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-xl font-bold">
            <Link to="/">Start reading</Link>
          </Button>
        </div>
      )}
    </PageLayout>
  );
}
