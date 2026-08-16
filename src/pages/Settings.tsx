import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellOff,
  BookOpen,
  ChevronRight,
  Cloud,
  Download,
  Highlighter,
  Languages,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { SettingsSection, SettingsRow } from "@/components/SettingsSection";
import { StartDatePicker } from "@/components/StartDatePicker";
import { ReminderPicker } from "@/components/ReminderPicker";
import { UserProfile } from "@/components/UserProfile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/hooks/useSettings";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { translationInfo, type ThemePreference } from "@/contexts/SettingsContext";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "sepia", label: "Sepia", icon: BookOpen },
  { value: "midnight", label: "Midnight", icon: Sparkles },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies readonly { value: ThemePreference; label: string; icon: unknown }[];

const APP_VERSION = "1.0.0";

export default function Settings() {
  const { settings, updateSettings, updateReminders, resetSettings } = useSettings();
  const {
    history,
    startDate,
    totalChaptersRead,
    streakCount,
    listPositions,
    updateStartDate,
    resetProgress,
    importProgress,
  } = useProgress();
  const { user, signOut } = useAuth();
  const { restart: restartOnboarding } = useOnboarding();
  const push = usePushNotifications();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isReplayingWalkthrough, setIsReplayingWalkthrough] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const totalCycles = listPositions.reduce((sum, p) => sum + p.completedCycles, 0);
  const translation = translationInfo(settings.translation);

  const handleExport = () => {
    // A self-describing envelope, so a backup taken today can still be
    // recognised and migrated by a much later version of the app.
    const backup = {
      app: "scripture-daily",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      progress: { version: 2, history, startDate, updatedAt: new Date().toISOString() },
      settings,
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `scripture-daily-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Backup downloaded");
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { progress?: unknown };
      if (importProgress(parsed.progress)) {
        toast.success("Progress restored", {
          description: "Your backup has been merged in.",
        });
      } else {
        toast.error("That file doesn't contain valid progress data");
      }
    } catch {
      toast.error("Couldn't read that file");
    }
  };

  const handleReset = () => {
    resetProgress();
    resetSettings();
    setShowResetDialog(false);
    toast.success("Everything has been reset");
  };

  const handleEnableNotifications = async () => {
    const result = await push.requestPermission();
    if (result.ok) {
      toast.success("Reminders enabled");
      updateReminders({ enabled: true });
    } else {
      toast.error(result.error);
    }
  };

  if (isReplayingWalkthrough) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setIsReplayingWalkthrough(false);
          toast.success("Walkthrough completed");
        }}
      />
    );
  }

  return (
    <PageLayout title="Settings">
      {user ? (
        <Link
          to="/profile"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:bg-secondary/40 focus-ring"
        >
          <UserProfile size="lg" />
          <span className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              Synced
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </Link>
      ) : (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold">Back up your reading</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A free account keeps your streak safe across devices.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-xl font-semibold">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      <div className="space-y-5">
        <SettingsSection title="Reading">
          <StartDatePicker startDate={startDate} onChange={updateStartDate} />
          {/*
            Read-only on purpose. Translation is chosen in the reader, beside
            the verse that prompts the change — a Select here duplicated that
            control three taps from any scripture, which is where it used to
            live and why it was easy to miss.
          */}
          <SettingsRow
            label="Translation"
            description={`${translation.name} · change it in the reader`}
            action={
              <span className="flex h-11 items-center gap-2 rounded-xl bg-secondary/70 px-3 text-xs font-bold tracking-tight">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {translation.id}
              </span>
            }
          />
        </SettingsSection>

        <SettingsSection title="Reminders">
          {!push.isSupported ? (
            <SettingsRow
              label="Daily reminder"
              description="Not supported by this browser"
              action={
                <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              }
            />
          ) : push.permission === "denied" ? (
            <SettingsRow
              label="Daily reminder"
              description="Blocked — enable notifications for this site in your browser settings"
              action={
                <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              }
            />
          ) : push.permission !== "granted" ? (
            <SettingsRow
              label="Daily reminder"
              description="A gentle nudge at the time you choose"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableNotifications}
                  disabled={push.isBusy}
                  className="h-11 gap-1.5"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  Enable
                </Button>
              }
            />
          ) : (
            <ReminderPicker reminders={settings.reminders} onChange={updateReminders} />
          )}
        </SettingsSection>

        <SettingsSection title="Appearance">
          <div className="p-4 space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Theme Palette
            </label>
            <div className="grid grid-cols-5 gap-2">
              {THEME_OPTIONS.map((option) => {
                const isSelected = settings.theme === option.value;
                const Icon = option.icon as React.ElementType;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ theme: option.value as ThemePreference })}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition-all focus-ring",
                      isSelected
                        ? "border-primary bg-primary/[0.08] shadow-sm text-primary font-bold"
                        : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-3xs font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <SettingsRow
            label="Sound"
            description="A soft tone when you mark a chapter"
            action={
              <Switch
                checked={settings.soundEffects}
                onCheckedChange={(checked) => updateSettings({ soundEffects: checked })}
                aria-label="Sound effects"
              />
            }
          />
          <SettingsRow
            label="Vibration"
            description="Haptic feedback on supported devices"
            action={
              <Switch
                checked={settings.hapticFeedback}
                onCheckedChange={(checked) => updateSettings({ hapticFeedback: checked })}
                aria-label="Haptic feedback"
              />
            }
          />
          <SettingsRow
            label="Reduce motion"
            description="Minimise animation throughout the app"
            action={
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(checked) => updateSettings({ reduceMotion: checked })}
                aria-label="Reduce motion"
              />
            }
          />
          <SettingsRow
            label="Immersive reader"
            description="Hide the header when scrolling down"
            action={
              <Switch
                checked={settings.immersiveReader}
                onCheckedChange={(checked) => updateSettings({ immersiveReader: checked })}
                aria-label="Immersive reader"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Your reading">
          <SettingsRow
            label="Highlights & Notes"
            description="View your saved verses and reflections"
            action={
              <Button asChild variant="ghost" size="sm" className="h-11 gap-1.5">
                <Link to="/highlights" aria-label="View highlights & notes">
                  <Highlighter className="h-4 w-4" aria-hidden="true" />
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <SettingsRow
            label="Milestones"
            description={`${totalCycles} ${totalCycles === 1 ? "cycle" : "cycles"} completed`}
            action={
              <Button asChild variant="ghost" size="sm" className="h-11 gap-1.5">
                <Link to="/milestones" aria-label="View milestones">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <SettingsRow
            label="Replay the introduction"
            description="See the walkthrough again"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  restartOnboarding();
                  setIsReplayingWalkthrough(true);
                }}
                className="h-11 gap-1.5 text-muted-foreground hover:text-foreground focus-ring"
                aria-label="Replay introduction"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow
            label="Export a backup"
            description="Download everything as a JSON file"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                className="h-11 text-muted-foreground"
                aria-label="Export data"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          />
          <SettingsRow
            label="Restore a backup"
            description="Merge a previously exported file"
            action={
              <>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImport(file);
                    event.target.value = ""; // Allow re-picking the same file.
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => importInputRef.current?.click()}
                  className="h-11 text-muted-foreground"
                  aria-label="Restore from backup"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            }
          />
          <SettingsRow
            label="Reset everything"
            description="Permanently delete all progress"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="h-11 text-destructive hover:text-destructive"
                aria-label="Reset all data"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          />
        </SettingsSection>

        <SettingsSection title="Account">
          {user ? (
            <SettingsRow
              label="Sign out"
              description={user.email ?? undefined}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    toast.success("Signed out");
                  }}
                  className="h-11 gap-1.5 text-muted-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              }
            />
          ) : (
            <SettingsRow
              label="Sign in"
              description="Sync your progress across devices"
              action={
                <Button asChild variant="ghost" size="sm" className="h-11 gap-1.5">
                  <Link to="/auth" aria-label="Sign in">
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          )}
        </SettingsSection>

        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Lifetime
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { value: totalChaptersRead, label: "Chapters" },
              { value: streakCount, label: "Day streak" },
              { value: totalCycles, label: "Cycles" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-2xl font-bold tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Scripture Daily v{APP_VERSION}
          <br />
          <span className="text-muted-foreground/70">
            Professor Grant Horner's reading system
          </span>
        </p>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all {totalChaptersRead.toLocaleString()} chapters of recorded
              progress and resets your preferences. It cannot be undone — export a backup
              first if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl">Keep my data</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
