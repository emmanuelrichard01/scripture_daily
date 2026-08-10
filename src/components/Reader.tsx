import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { useAudio } from "@/hooks/useAudio";

interface ReaderProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  listName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: Verse[];
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export function Reader({
  isOpen,
  onOpenChange,
  book,
  chapter,
  listName,
  isCompleted,
  onToggleComplete,
}: ReaderProps) {
  const [data, setData] = useState<BibleApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const haptics = useHaptics();
  const audio = useAudio();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchChapter = async () => {
      setIsLoading(true);
      setError(null);
      setData(null);
      try {
        // Fetching from bible-api.com (default is World English Bible)
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(book)}%20${chapter}`);
        if (!response.ok) {
          throw new Error("Failed to fetch chapter");
        }
        const json = await response.json();
        if (isMounted) setData(json);
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to load scripture text. Please check your connection.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChapter();

    return () => {
      isMounted = false;
    };
  }, [isOpen, book, chapter]);

  const handleToggle = () => {
    haptics.light();
    if (!isCompleted) {
      audio.playBloop();
    }
    onToggleComplete();
    // Optional: close the reader after marking complete
    // onOpenChange(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-t">
        <DrawerHeader className="text-left pb-2 shrink-0 border-b">
          <DrawerTitle className="text-2xl font-serif text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {book} {chapter}
          </DrawerTitle>
          <DrawerDescription className="text-sm font-medium text-muted-foreground">
            {listName} • {data?.translation_name || "World English Bible"}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 space-y-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Loading scripture...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-40 space-y-4 text-destructive text-center">
              <p>{error}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          )}

          {data && (
            <div className="max-w-2xl mx-auto pb-10">
              <div className="space-y-4">
                <p className="text-lg leading-relaxed text-foreground font-serif">
                  {data.verses.map((v) => (
                    <span key={v.verse}>
                      <sup className="text-xs text-muted-foreground font-sans mr-1 select-none">
                        {v.verse}
                      </sup>
                      {v.text}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="shrink-0 border-t bg-background/50 backdrop-blur-md pb-safe">
          <Button
            size="lg"
            variant={isCompleted ? "secondary" : "default"}
            className="w-full h-14 rounded-2xl text-lg font-medium shadow-lg transition-all active:scale-[0.98]"
            onClick={handleToggle}
          >
            {isCompleted ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Completed
              </>
            ) : (
              "Mark as Read"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
