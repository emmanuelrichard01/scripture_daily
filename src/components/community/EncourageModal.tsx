import { useState } from "react";
import { Hand, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ENCOURAGEMENT_QUOTES, type EncouragementQuote } from "@/lib/friends";
import { cn } from "@/lib/utils";

interface EncourageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  friendName: string;
  friendId: string;
  onSend: (options: {
    friendId: string;
    name: string;
    message?: string;
    scriptureQuote?: { reference: string; text: string };
  }) => void;
  isSending: boolean;
}

export function EncourageModal({
  isOpen,
  onOpenChange,
  friendName,
  friendId,
  onSend,
  isSending,
}: EncourageModalProps) {
  const [selectedQuote, setSelectedQuote] = useState<EncouragementQuote | null>(
    ENCOURAGEMENT_QUOTES[0],
  );
  const [customNote, setCustomNote] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const handleSend = () => {
    if (useCustom && customNote.trim()) {
      onSend({
        friendId,
        name: friendName,
        message: customNote.trim(),
      });
    } else if (selectedQuote) {
      onSend({
        friendId,
        name: friendName,
        scriptureQuote: {
          reference: selectedQuote.reference,
          text: selectedQuote.text,
        },
      });
    } else {
      onSend({
        friendId,
        name: friendName,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Hand className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-display text-base font-bold truncate">
                Encourage {friendName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Send a scripture or brief note to inspire today's reading.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-3.5">
          {/* Preset Scripture Quote Selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Scripture Encouragement
              </span>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {useCustom ? "Choose scripture" : "Custom note"}
              </button>
            </div>

            {!useCustom ? (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {ENCOURAGEMENT_QUOTES.map((quote) => {
                  const isSelected = selectedQuote?.id === quote.id;
                  return (
                    <button
                      key={quote.id}
                      type="button"
                      onClick={() => setSelectedQuote(quote)}
                      className={cn(
                        "w-full rounded-xl border p-2.5 text-left transition-all duration-150 focus-ring cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
                          {quote.reference}
                        </span>
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.62rem] font-semibold text-muted-foreground">
                          {quote.theme}
                        </span>
                      </div>
                      <p className="mt-1 font-serif text-xs italic line-clamp-2">
                        "{quote.text}"
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <Textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value.slice(0, 140))}
                  placeholder="e.g. Praying for you today! Let's stay consistent."
                  className="h-20 resize-none rounded-xl text-xs"
                />
                <p className="text-right text-[0.62rem] text-muted-foreground">
                  {customNote.length}/140 characters
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || (useCustom && !customNote.trim())}
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
