import { useState } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { SettingsSection, SettingsRow } from "@/components/SettingsSection";
import { ReminderPicker } from "@/components/ReminderPicker";
import { StartDatePicker } from "@/components/StartDatePicker";
import { UserProfile } from "@/components/UserProfile";
import { useSettings } from "@/hooks/useSettings";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useCycleMilestones } from "@/hooks/useCycleMilestones";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoTheme } from "@/hooks/useAutoTheme";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Moon,
  Sun,
  Monitor,
  Sunrise,
  Trash2,
  Download,
  LogOut,
  LogIn,
  Cloud,
  ChevronRight,
  Bell,
  BellOff,
  User,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const {
    settings,
    updateSettings,
    updateReminders,
    requestNotificationPermission,
  } = useSettings();

  const { totalChaptersRead, streakCount, resetProgress, startDate, updateStartDate, listProgress } = useCloudProgress();
  const { cycleStats, totalStats } = useCycleMilestones(listProgress);
  const { user, signOut } = useAuth();
  const { isDarkNow } = useAutoTheme();
  const { isSupported: pushSupported, permission: pushPermission, requestPermission: requestPushPermission } = usePushNotifications();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleExportData = () => {
    const data = {
      progress: localStorage.getItem("scripture-daily-progress-v2"),
      settings: localStorage.getItem("horner-settings"),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scripture-daily-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully");
  };

  const handleResetData = () => {
    resetProgress();
    localStorage.removeItem("horner-settings");
    setShowResetDialog(false);
    toast.success("All data has been reset");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  const handleEnableNotifications = async () => {
    if (!pushSupported) {
      toast.error("Notifications not supported on this device");
      return;
    }

    const result = await requestPushPermission();
    if (result.success) {
      toast.success("Notifications enabled!");
    } else {
      toast.error(result.error || "Could not enable notifications");
    }
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
    auto: Sunrise,
  };

  const ThemeIcon = themeIcons[settings.theme];

  // Get lists with completed cycles for milestones display
  const completedCycleLists = cycleStats.filter(s => s.completedCycles > 0);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <Header left={<h1 className="text-xl font-heading font-semibold text-foreground">Settings</h1>} />

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5" role="main" aria-label="Settings">
        {/* User Profile Card */}
        {user ? (
          <Link 
            to="/profile" 
            className="card-elevated p-5 block hover:bg-secondary/40 transition-all border border-border/60 shadow-md relative overflow-hidden group"
            aria-label="Edit profile"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <UserProfile size="lg" showGreeting={true} />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-track-green/10 text-track-green border border-track-green/20">
                  <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-[11px] font-bold">Cloud Synced</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="card-elevated p-5 bg-gradient-to-br from-primary/10 via-background to-secondary/30 border border-primary/20 shadow-md flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-foreground text-base">Sync Your Reading Progress</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Create a free account to back up streaks & history</p>
            </div>
            <Link to="/auth">
              <Button size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          </div>
        )}

        {/* Account Section */}
        <SettingsSection
          title="Account"
          description={user ? user.email || "Signed in" : "Sync across devices"}
        >
          {user ? (
            <>
              <SettingsRow
                label="Edit Profile"
                description="Name, avatar, preferences"
                action={
                  <Link to="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground min-h-[44px]"
                      aria-label="Edit profile"
                    >
                      <User className="w-4 h-4" aria-hidden="true" />
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                }
              />
              <SettingsRow
                label="Sign Out"
                action={
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                }
              />
            </>
          ) : (
            <SettingsRow
              label="Sign In"
              description="Sync your progress across devices"
              action={
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground min-h-[44px]"
                    aria-label="Sign in"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" />
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              }
            />
          )}
        </SettingsSection>

        {/* Reading Settings */}
        <SettingsSection title="Reading">
          <StartDatePicker 
            currentStartDate={startDate}
            onUpdateStartDate={updateStartDate}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          {pushSupported ? (
            <>
              <SettingsRow
                label="Push Notifications"
                description={
                  pushPermission === "granted" 
                    ? "Daily reminders enabled" 
                    : "Get gentle daily reminders"
                }
                action={
                  pushPermission === "granted" ? (
                    <div className="flex items-center gap-2 text-track-green">
                      <Bell className="w-4 h-4" aria-hidden="true" />
                      <span className="text-xs font-medium">Enabled</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnableNotifications}
                      className="gap-1.5 min-h-[44px]"
                      aria-label="Enable notifications"
                    >
                      <Bell className="w-4 h-4" aria-hidden="true" />
                      Enable
                    </Button>
                  )
                }
              />
              {pushPermission === "granted" && (
                <ReminderPicker
                  reminders={settings.reminders}
                  notificationPermission={settings.notificationPermission}
                  onUpdate={updateReminders}
                  onRequestPermission={requestNotificationPermission}
                />
              )}
            </>
          ) : (
            <SettingsRow
              label="Push Notifications"
              description="Not supported on this device"
              action={
                <BellOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              }
            />
          )}
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingsRow
            label="Theme"
            description={settings.theme === "auto" ? (isDarkNow ? "Dark until sunrise" : "Light until sunset") : undefined}
            action={
              <Select
                value={settings.theme}
                onValueChange={(value: "light" | "dark" | "system" | "auto") =>
                  updateSettings({ theme: value })
                }
              >
                <SelectTrigger className="w-32 h-11 border-0 bg-secondary" aria-label="Select theme">
                  <div className="flex items-center gap-2">
                    <ThemeIcon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="auto">Auto (Sun)</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <SettingsRow
            label="Haptic Feedback"
            description="Vibration on interactions"
            action={
              <Switch
                checked={settings.hapticFeedback}
                onCheckedChange={(checked) =>
                  updateSettings({ hapticFeedback: checked })
                }
                aria-label="Toggle haptic feedback"
              />
            }
          />
        </SettingsSection>

        {/* Milestones */}
        <SettingsSection
          title="Milestones"
          description="Cycle counts across the 10 tracks"
        >
          <SettingsRow
            label="View Milestones"
            description="Per-track cycles and quiet progress"
            action={
              <Link to="/milestones">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground min-h-[44px]"
                  aria-label="View milestones"
                >
                  <Trophy className="w-4 h-4" aria-hidden="true" />
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            }
          />

          {completedCycleLists.length > 0 && (
            <div className="px-4 py-3 space-y-2" role="list" aria-label="Completed cycles">
              {completedCycleLists.map((stat) => (
                <div
                  key={stat.listId}
                  className="flex items-center gap-3 py-2"
                  role="listitem"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `hsl(var(${stat.colorVar}) / 0.15)` }}
                    aria-hidden="true"
                  >
                    <Trophy
                      className="w-4 h-4"
                      style={{ color: `hsl(var(${stat.colorVar}))` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{stat.listName}</p>
                    <p className="text-xs text-muted-foreground">
                      Read {stat.completedCycles} {stat.completedCycles === 1 ? "time" : "times"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data">
          <SettingsRow
            label="Export Data"
            description="Download backup file"
            action={
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
                aria-label="Export data"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            }
          />
          <SettingsRow
            label="Reset All Data"
            description="Delete all progress"
            action={
              <button
                onClick={() => setShowResetDialog(true)}
                className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors min-h-[44px] px-2"
                aria-label="Reset all data"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            }
          />
        </SettingsSection>

        {/* Stats Summary Widget */}
        <div className="card-elevated p-5 bg-gradient-to-br from-track-blue/10 via-background to-track-purple/10 border border-border/80 shadow-md relative overflow-hidden" role="region" aria-label="Your progress summary">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Reading Lifetime Summary
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-background/60 p-3 rounded-2xl border border-border/40 backdrop-blur-sm">
              <p className="text-2xl font-heading font-bold text-foreground">
                {totalChaptersRead}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Chapters</p>
            </div>
            <div className="bg-background/60 p-3 rounded-2xl border border-border/40 backdrop-blur-sm">
              <p className="text-2xl font-heading font-bold text-track-orange">
                {streakCount}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Day Streak</p>
            </div>
            <div className="bg-background/60 p-3 rounded-2xl border border-border/40 backdrop-blur-sm">
              <p className="text-2xl font-heading font-bold text-track-yellow">
                {totalStats.totalCycles}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Cycles</p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Scripture Daily v1.0</p>
          <p className="text-2xs text-muted-foreground/70 mt-0.5">
            Horner Bible Reading System
          </p>
        </div>
      </main>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="max-w-sm mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your reading progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl min-h-[44px]"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Settings;
