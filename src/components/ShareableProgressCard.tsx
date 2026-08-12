import { useRef, useState } from "react";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useCycleMilestones } from "@/hooks/useCycleMilestones";
import { readingLists, getDayOfYear } from "@/lib/readingPlan";
import { Download, Share2, X, Flame, Calendar, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareableProgressCardProps {
  streak: number;
  totalChapters: number;
  onClose: () => void;
}

export function ShareableProgressCard({ streak, totalChapters, onClose }: ShareableProgressCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { listProgress, totalChaptersRead, streakCount, startDate } = useCloudProgress();
  const { user } = useAuth();
  const { cycleStats, totalStats } = useCycleMilestones(listProgress);

  const today = new Date();
  const currentYear = today.getFullYear();
  const dayOfYear = getDayOfYear(today);

  // Calculate yearly stats
  const displayName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.display_name || 
                      "Scripture Reader";

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

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-sm w-full animate-scale-in flex flex-col gap-4">
        {/* Header (Outside the card so it doesn't get captured in image) */}
        <div className="flex items-center justify-between px-2">
          <h3 className="font-semibold text-lg text-foreground font-heading">Share Progress</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* The Card to be captured */}
        <div
          ref={cardRef}
          className="rounded-3xl p-6 border border-border shadow-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
          }}
        >
          {/* Decorative background glow */}
          <div 
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--track-purple)))" }}
          />
          
          {/* Logo area */}
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl shadow-lg border border-border/50 overflow-hidden flex-shrink-0 bg-secondary/20 flex items-center justify-center">
              <img 
                src="/apple-touch-icon.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <h4 className="text-[17px] font-heading font-bold text-foreground leading-tight tracking-tight">Scripture Daily</h4>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{currentYear} Progress</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
            <div className="bg-background/50 rounded-2xl p-4 border border-border/50 flex flex-col justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chapters</span>
              </div>
              <p className="text-3xl font-bold text-foreground font-heading">{totalChaptersRead}</p>
            </div>
            
            <div className="bg-background/50 rounded-2xl p-4 border border-border/50 flex flex-col justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-track-orange" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Streak</span>
              </div>
              <p className="text-3xl font-bold text-foreground font-heading">{streakCount}</p>
            </div>

            <div className="bg-background/50 rounded-2xl p-4 border border-border/50 flex flex-col justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-track-green" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Days</span>
              </div>
              <p className="text-3xl font-bold text-foreground font-heading">{daysActive}</p>
            </div>

            <div className="bg-background/50 rounded-2xl p-4 border border-border/50 flex flex-col justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-track-yellow" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycles</span>
              </div>
              <p className="text-3xl font-bold text-foreground font-heading">{totalStats.totalCycles}</p>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center justify-between border-t border-border/50 pt-5 relative z-10">
            <p className="text-sm font-bold text-foreground">{displayName}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Horner System
            </p>
          </div>
        </div>

        {/* Actions (Outside the card) */}
        <div className="flex gap-3 mt-2">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            variant="outline"
            className="flex-1 gap-2 h-12 rounded-xl bg-card border-border shadow-sm hover:bg-secondary/50 font-bold"
          >
            <Download className="w-4 h-4" />
            Save Image
          </Button>
          <Button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 gap-2 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-bold shadow-primary/20"
          >
            <Share2 className="w-4 h-4" />
            Share Progress
          </Button>
        </div>
      </div>
    </div>
  );
}
