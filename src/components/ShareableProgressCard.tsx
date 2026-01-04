import { useRef, useState } from "react";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useAuth } from "@/contexts/AuthContext";
import { readingLists, getDayOfYear } from "@/lib/readingPlan";
import { Download, Share2, X, BookOpen, Flame, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareableProgressCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareableProgressCard({ isOpen, onClose }: ShareableProgressCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { completedSet, totalChaptersRead, streakCount, startDate } = useCloudProgress();
  const { user } = useAuth();

  const today = new Date();
  const currentYear = today.getFullYear();
  const dayOfYear = getDayOfYear(today);

  // Calculate yearly stats
  const displayName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.display_name || 
                      "Scripture Reader";

  // Calculate cycles completed per list
  const listStats = readingLists.map((list) => {
    const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
    let completedCount = 0;
    completedSet.forEach((key) => {
      if (key.endsWith(`-${list.id}`)) completedCount++;
    });
    return {
      name: list.name,
      cycles: Math.floor(completedCount / totalChapters),
      colorVar: list.colorVar,
    };
  });

  const totalCycles = listStats.reduce((sum, s) => sum + s.cycles, 0);
  const daysActive = Math.max(1, Math.floor((today.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import("html2canvas")).default;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `scripture-daily-${currentYear}-progress.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Progress card downloaded!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Could not generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Could not generate image");
          return;
        }

        const file = new File([blob], "scripture-daily-progress.png", { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "My Scripture Daily Progress",
              text: `I've read ${totalChaptersRead} chapters of Scripture! 📖`,
            });
          } catch (error) {
            if ((error as Error).name !== "AbortError") {
              toast.error("Could not share");
            }
          }
        } else {
          // Fallback to download
          handleDownload();
        }
      }, "image/png");
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Could not share");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-sm w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Share Progress</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="p-4">
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-background via-background to-secondary/30 rounded-2xl p-5 border border-border"
          >
            {/* Logo area */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Scripture Daily</p>
                <p className="text-2xs text-muted-foreground">{currentYear} Progress</p>
              </div>
            </div>

            {/* User */}
            <p className="text-sm text-muted-foreground mb-4">{displayName}</p>

            {/* Main stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-card/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-track-blue" />
                  <span className="text-2xs text-muted-foreground">Chapters</span>
                </div>
                <p className="text-xl font-bold text-foreground">{totalChaptersRead}</p>
              </div>
              <div className="bg-card/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-track-orange" />
                  <span className="text-2xs text-muted-foreground">Streak</span>
                </div>
                <p className="text-xl font-bold text-foreground">{streakCount}</p>
              </div>
              <div className="bg-card/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-track-green" />
                  <span className="text-2xs text-muted-foreground">Days Active</span>
                </div>
                <p className="text-xl font-bold text-foreground">{daysActive}</p>
              </div>
              <div className="bg-card/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-3.5 h-3.5 text-track-yellow" />
                  <span className="text-2xs text-muted-foreground">Cycles</span>
                </div>
                <p className="text-xl font-bold text-foreground">{totalCycles}</p>
              </div>
            </div>

            {/* Track indicators */}
            <div className="flex gap-1">
              {listStats.map((stat, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ 
                    backgroundColor: stat.cycles > 0 
                      ? `hsl(${stat.colorVar})` 
                      : "hsl(var(--secondary))" 
                  }}
                  title={`${stat.name}: ${stat.cycles} cycles`}
                />
              ))}
            </div>

            {/* Footer */}
            <p className="text-center text-2xs text-muted-foreground mt-4">
              Day {dayOfYear} of {currentYear} • Horner's Bible Reading System
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            variant="outline"
            className="flex-1 gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
