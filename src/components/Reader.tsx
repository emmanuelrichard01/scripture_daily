import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Check,
  ChevronUp,
  Globe,
  Type,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { useAudio } from "@/hooks/useAudio";
import { useSettings } from "@/hooks/useSettings";
import { getBookId, AVAILABLE_VERSIONS } from "@/utils/bibleBooks";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface TypographySettings {
  fontSize: number; // 15, 17, 19, 21, 23
  fontFamily: "sans" | "serif";
  lineHeight: number; // 1.5, 1.75, 2.0
}

const TYPOGRAPHY_KEY = "scripture-reader-typography";

const defaultTypography: TypographySettings = {
  fontSize: 17,
  fontFamily: "serif",
  lineHeight: 1.75,
};

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
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Reader Typography Settings
  const [typography, setTypography] = useState<TypographySettings>(() => {
    try {
      const saved = localStorage.getItem(TYPOGRAPHY_KEY);
      return saved ? { ...defaultTypography, ...JSON.parse(saved) } : defaultTypography;
    } catch {
      return defaultTypography;
    }
  });

  const updateTypography = (updates: Partial<TypographySettings>) => {
    setTypography((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(TYPOGRAPHY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const haptics = useHaptics();
  const audio = useAudio();
  const { settings, updateSettings } = useSettings();
  const preferredVersion = settings.preferredVersion || "ESV";

  // Explicit local state for version selection to guarantee instant re-fetch
  const [currentVersion, setCurrentVersion] = useState<string>(preferredVersion);

  useEffect(() => {
    setCurrentVersion(preferredVersion);
  }, [preferredVersion]);

  const handleVersionChange = (newVersion: string) => {
    haptics.light();
    setCurrentVersion(newVersion);
    updateSettings({ preferredVersion: newVersion });
  };

  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Handle scroll to top button visibility
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 350);
  };

  const scrollToTop = () => {
    haptics.light();
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fetch scripture chapter
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

        const url = `https://bolls.life/get-text/${currentVersion}/${bookId}/${chapter}/`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${currentVersion} translation from Bolls API`);
        }

        const json = await response.json();

        if (isMounted) {
          setVerses(json);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(
            `Failed to load ${currentVersion} translation. Please check your connection or try another version.`
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChapter();

    return () => {
      isMounted = false;
    };
  }, [isOpen, book, chapter, currentVersion]);

  const handleToggle = () => {
    haptics.light();
    if (!isCompleted) {
      audio.playBloop();
    }
    onToggleComplete();
  };

  // Helper to clean Bolls HTML (removes Strong's numbers <S>123</S> but preserves line breaks)
  const formatVerseText = (text: string) => {
    // 1. Remove Strong's concordance tags <S>...</S>
    let cleaned = text.replace(/<S>\d+<\/S>/g, "");
    // 2. Remove <sup> footnote indicators
    cleaned = cleaned.replace(/<sup>.*?<\/sup>/g, "");
    return cleaned;
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92vh] flex flex-col bg-background/95 backdrop-blur-2xl border-t border-border/80 shadow-2xl">
        {/* Drawer handle */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

        {/* Header */}
        <DrawerHeader className="text-left pb-3 shrink-0 border-b border-border/50 flex flex-row items-center justify-between px-5 mt-1">
          <div>
            <DrawerTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2 tracking-tight">
              <BookOpen className="w-5 h-5 text-primary" />
              {book} {chapter}
            </DrawerTitle>
            <DrawerDescription className="text-xs font-semibold text-muted-foreground mt-0.5 tracking-wider uppercase">
              {listName}
            </DrawerDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Typography Settings Button */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-2 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground transition-all active:scale-95 border border-border/40 focus-ring"
                  aria-label="Typography settings"
                >
                  <Type className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-72 p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl space-y-4 z-[110]"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Display Settings
                  </span>
                </div>

                {/* Font Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Font Size</span>
                    <span className="text-muted-foreground">{typography.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-xl">
                    <button
                      disabled={typography.fontSize <= 14}
                      onClick={() =>
                        updateTypography({ fontSize: Math.max(14, typography.fontSize - 1) })
                      }
                      className="p-1.5 rounded-lg hover:bg-background disabled:opacity-30 transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center text-xs font-medium">
                      {typography.fontSize}
                    </div>
                    <button
                      disabled={typography.fontSize >= 24}
                      onClick={() =>
                        updateTypography({ fontSize: Math.min(24, typography.fontSize + 1) })
                      }
                      className="p-1.5 rounded-lg hover:bg-background disabled:opacity-30 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Font Style</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-secondary/50 p-1 rounded-xl">
                    <button
                      onClick={() => updateTypography({ fontFamily: "serif" })}
                      className={`py-1.5 text-xs rounded-lg transition-all ${
                        typography.fontFamily === "serif"
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      Serif (Classic)
                    </button>
                    <button
                      onClick={() => updateTypography({ fontFamily: "sans" })}
                      className={`py-1.5 text-xs rounded-lg transition-all ${
                        typography.fontFamily === "sans"
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      Sans (Modern)
                    </button>
                  </div>
                </div>

                {/* Line Height */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Line Spacing</span>
                  <div className="grid grid-cols-3 gap-1 bg-secondary/50 p-1 rounded-xl">
                    {[
                      { label: "Compact", val: 1.5 },
                      { label: "Normal", val: 1.75 },
                      { label: "Relaxed", val: 2.0 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => updateTypography({ lineHeight: item.val })}
                        className={`py-1 text-[11px] font-medium rounded-lg transition-all ${
                          typography.lineHeight === item.val
                            ? "bg-background text-foreground shadow-sm font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Translation Select (Rock-solid Native Select wrapper) */}
            <div className="relative flex items-center">
              <select
                value={currentVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="appearance-none bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold pl-3 pr-7 py-1.5 rounded-xl border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all"
                aria-label="Select Bible Translation"
              >
                {AVAILABLE_VERSIONS.map((v) => (
                  <option key={v.id} value={v.id} className="bg-card text-foreground">
                    {v.id}
                  </option>
                ))}
              </select>
              <Globe className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </DrawerHeader>

        {/* Reader Content Area */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={viewportRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-6 py-6 scrollbar-thin"
          >
            {/* Loading Skeleton */}
            {isLoading && (
              <div className="max-w-xl mx-auto space-y-4 py-4 animate-pulse">
                <div className="h-6 bg-secondary/70 rounded-lg w-1/3 mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-secondary/50 rounded w-full" />
                  <div className="h-4 bg-secondary/50 rounded w-[94%]" />
                  <div className="h-4 bg-secondary/50 rounded w-[98%]" />
                  <div className="h-4 bg-secondary/50 rounded w-[85%]" />
                </div>
                <div className="space-y-3 pt-4">
                  <div className="h-4 bg-secondary/50 rounded w-full" />
                  <div className="h-4 bg-secondary/50 rounded w-[92%]" />
                  <div className="h-4 bg-secondary/50 rounded w-[96%]" />
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 px-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm text-destructive font-medium max-w-xs">{error}</p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Close Reader
                </Button>
              </div>
            )}

            {/* Verses Render */}
            {!isLoading && !error && verses.length > 0 && (
              <article
                className={`max-w-xl mx-auto pb-20 pt-2 transition-all text-foreground ${
                  typography.fontFamily === "serif" ? "font-serif" : "font-sans"
                }`}
                style={{
                  fontSize: `${typography.fontSize}px`,
                  lineHeight: typography.lineHeight,
                  fontFamily:
                    typography.fontFamily === "serif"
                      ? "Georgia, 'Times New Roman', serif"
                      : "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {verses.map((v) => {
                  const cleanedText = formatVerseText(v.text);

                  return (
                    <span key={v.verse} className="inline">
                      <sup className="text-[0.65em] font-sans font-bold text-primary mr-1 select-none align-super">
                        {v.verse}
                      </sup>
                      <span
                        dangerouslySetInnerHTML={{ __html: cleanedText }}
                        className="inline"
                      />
                      {" "}
                    </span>
                  );
                })}
              </article>
            )}
          </div>

          {/* Floating Scroll-to-Top Button */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToTop}
                className="absolute bottom-6 right-6 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all z-20 focus-ring"
                aria-label="Scroll to top"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Glass Footer */}
        <DrawerFooter className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-xl p-4 safe-area-bottom flex flex-row gap-3">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="h-13 flex-1 rounded-2xl font-bold border-border/60 text-muted-foreground hover:text-foreground"
            >
              Done
            </Button>
          </DrawerClose>
          <Button
            size="lg"
            variant={isCompleted ? "secondary" : "default"}
            className={`flex-[2] h-13 rounded-2xl text-base font-bold shadow-md transition-all active:scale-[0.98] ${
              isCompleted
                ? "bg-secondary text-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            }`}
            onClick={handleToggle}
          >
            {isCompleted ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-track-green" />
                Completed
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 fill-current" />
                Mark Complete
              </span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
