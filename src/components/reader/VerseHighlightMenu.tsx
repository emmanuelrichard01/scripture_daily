import { useState } from "react";
import { Copy, MessageSquare, Share2, Trash2, Check, X } from "lucide-react";
import {
  HIGHLIGHT_PALETTE,
  type HighlightColor,
  type VerseHighlight,
} from "@/lib/highlights";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VerseHighlightMenuProps {
  book: string;
  chapter: number;
  verse: number;
  verseText: string;
  currentHighlight: VerseHighlight | null;
  onSetColor: (color: HighlightColor) => void;
  onRemoveHighlight: () => void;
  onSaveNote: (note: string | null) => void;
  onClose: () => void;
}

export function VerseHighlightMenu({
  book,
  chapter,
  verse,
  verseText,
  currentHighlight,
  onSetColor,
  onRemoveHighlight,
  onSaveNote,
  onClose,
}: VerseHighlightMenuProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(currentHighlight?.note ?? "");
  const reference = `${book} ${chapter}:${verse}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`"${verseText}" (${reference})`);
      toast.success("Verse copied to clipboard");
      onClose();
    } catch {
      toast.error("Failed to copy verse");
    }
  };

  const handleShare = async () => {
    const content = `"${verseText}" (${reference})`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: reference,
          text: content,
          url: window.location.origin,
        });
        onClose();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        void handleCopy();
      }
    } else {
      void handleCopy();
    }
  };

  const handleSaveNoteSubmit = () => {
    const trimmed = noteText.trim();
    onSaveNote(trimmed.length > 0 ? trimmed : null);
    setIsEditingNote(false);
    toast.success(trimmed.length > 0 ? "Note saved" : "Note removed");
  };

  return (
    <div
      className="animate-rise rounded-2xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md"
      role="dialog"
      aria-label={`Highlight options for ${reference}`}
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2.5">
        <span className="font-display text-xs font-bold text-foreground">
          {reference}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {!isEditingNote ? (
        <div className="space-y-2.5">
          {/* Highlight Color Pickers */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Highlight:
            </span>
            <div className="flex items-center gap-2">
              {(Object.keys(HIGHLIGHT_PALETTE) as HighlightColor[]).map((color) => {
                const palette = HIGHLIGHT_PALETTE[color];
                const isSelected = currentHighlight?.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onSetColor(color);
                      toast.success(`Highlighted in ${palette.name}`);
                    }}
                    aria-label={`Highlight with ${palette.name}`}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 focus-ring",
                      palette.pillClass,
                      isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                );
              })}

              {currentHighlight && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveHighlight();
                    toast.success("Highlight removed");
                  }}
                  aria-label="Remove highlight"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Note Preview / Action */}
          {currentHighlight?.note && (
            <div className="rounded-xl bg-secondary/50 p-2.5 text-xs text-foreground/90 border border-border/50">
              <p className="font-semibold text-2xs uppercase text-muted-foreground mb-0.5">
                Note:
              </p>
              <p className="italic">{currentHighlight.note}</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingNote(true)}
              className="h-8 flex-1 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {currentHighlight?.note ? "Edit note" : "Add note"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Share
            </Button>
          </div>
        </div>
      ) : (
        /* Inline Note Editor */
        <div className="space-y-2.5">
          <Textarea
            value={noteText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteText(e.target.value)}
            placeholder="Write your thoughts or prayer reflections on this verse..."
            className="min-h-[80px] rounded-xl text-xs"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNote(false)}
              className="h-8 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNoteSubmit}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
