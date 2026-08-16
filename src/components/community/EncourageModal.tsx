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
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hand className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold">
                Encourage {friendName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Send a scripture or brief note to their device to inspire today's reading.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Preset Scripture Quote Selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Scripture Encouragement
              </span>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {useCustom ? "Choose from quotes" : "Write custom note"}
              </button>
            </div>

            {!useCustom ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {ENCOURAGEMENT_QUOTES.map((quote) => {
                  const isSelected = selectedQuote?.id === quote.id;
                  return (
                    <button
                      key={quote.id}
                      type="button"
                      onClick={() => setSelectedQuote(quote)}
                      className={cn(
                        "w-full rounded-2xl border p-3 text-left transition-all duration-200 focus-ring",
                        isSelected
                          ? "border-primary bg-primary/[0.06] shadow-sm"
                          : "border-border/60 bg-secondary/30 hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {quote.reference}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-3xs font-semibold text-muted-foreground">
                          {quote.theme}
                        </span>
                      </div>
                      <p className="mt-1 font-serif text-xs italic text-muted-foreground line-clamp-2">
                        "{quote.text}"
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value.slice(0, 140))}
                  placeholder="e.g. Praying for you today! Let's finish the Gospels together."
                  className="h-24 resize-none rounded-2xl text-xs"
                />
                <p className="text-right text-3xs text-muted-foreground">
                  {customNote.length}/140 characters
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || (useCustom && !customNote.trim())}
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold shadow-md"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send Encouragement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
