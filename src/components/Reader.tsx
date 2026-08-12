import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { useAudio } from "@/hooks/useAudio";
import { useSettings } from "@/hooks/useSettings";
import { getBookId, AVAILABLE_VERSIONS } from "@/utils/bibleBooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  verse: number;
  text: string;
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
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const haptics = useHaptics();
  const audio = useAudio();
  const { settings, updateSettings } = useSettings();
  const preferredVersion = settings.preferredVersion || "ESV";

  // Scroll to top when verses change
  useEffect(() => {
    if (verses.length > 0) {
      setTimeout(() => {
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  }, [verses]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchChapter = async () => {
      setIsLoading(true);
      setError(null);
      setVerses([]);
      
      try {
        const bookId = getBookId(book);
        if (!bookId) {
          throw new Error(`Could not find book ID for ${book}`);
        }

        const url = `https://bolls.life/get-text/${preferredVersion}/${bookId}/${chapter}/`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch chapter from Bolls API");
        }
        
        const json = await response.json();
        
        if (isMounted) {
          // Bolls API returns an array of { pk, verse, text }
          setVerses(json);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to load scripture text. Please check your connection or try another version.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChapter();

    return () => {
      isMounted = false;
    };
  }, [isOpen, book, chapter, preferredVersion]);

  const handleToggle = () => {
    haptics.light();
    if (!isCompleted) {
      audio.playBloop();
    }
    onToggleComplete();
  };

  const currentVersionName = AVAILABLE_VERSIONS.find(v => v.id === preferredVersion)?.name || preferredVersion;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-t">
        {/* Visual handle indicator */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
        
        <DrawerHeader className="text-left pb-4 shrink-0 border-b border-border/50 flex flex-row items-start justify-between pr-4 mt-2">
          <div>
            <DrawerTitle className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {book} {chapter}
            </DrawerTitle>
            <DrawerDescription className="text-[13px] font-medium text-muted-foreground mt-1 tracking-wide uppercase">
              {listName}
            </DrawerDescription>
          </div>
          <div className="pt-0.5">
            <Select
              value={preferredVersion}
              onValueChange={(value) => {
                haptics.light();
                updateSettings({ preferredVersion: value });
              }}
            >
              <SelectTrigger className="w-24 h-8 text-xs border-0 bg-secondary" aria-label="Translation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_VERSIONS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 space-y-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Loading {preferredVersion}...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-40 space-y-4 text-destructive text-center">
              <p>{error}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          )}

          {!isLoading && !error && verses.length > 0 && (
            <div className="max-w-2xl mx-auto pb-10 pt-2">
              <div className="space-y-4">
                <p className="reader-text">
                  {verses.map((v) => (
                    <span key={v.verse}>
                      <span className="reader-verse-number">
                        {v.verse}
                      </span>
                      {/* Strip any HTML from the API response to prevent XSS */}
                      {v.text.replace(/<[^>]*>/g, '')}
                      {' '}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="shrink-0 border-t bg-background/50 backdrop-blur-md pb-safe flex flex-row gap-3">
          <DrawerClose asChild>
            <Button variant="outline" className="h-14 flex-1 rounded-2xl">
              Close
            </Button>
          </DrawerClose>
          <Button
            size="lg"
            variant={isCompleted ? "secondary" : "default"}
            className="flex-[2] h-14 rounded-2xl text-lg font-medium shadow-lg transition-all active:scale-[0.98]"
            onClick={handleToggle}
          >
            {isCompleted ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Completed
              </>
            ) : (
              "Mark Complete"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
