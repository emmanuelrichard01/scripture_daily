import { useState } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { SettingsSection, SettingsRow } from "@/components/SettingsSection";
import { ReminderPicker } from "@/components/ReminderPicker";
import { StartDatePicker } from "@/components/StartDatePicker";
import { UserProfile } from "@/components/UserProfile";
import { useSettings } from "@/hooks/useSettings";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoTheme } from "@/hooks/useAutoTheme";
import { Switch } from "@/components/ui/switch";
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
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const {
    settings,
    updateSettings,
    updateReminders,
    requestNotificationPermission,
  } = useSettings();

  const { totalChaptersRead, streakCount, resetProgress, startDate, updateStartDate } = useCloudProgress();
  const { user, signOut } = useAuth();
  const { isDarkNow } = useAutoTheme();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleExportData = () => {
    const data = {
      progress: localStorage.getItem("horner-reading-progress"),
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

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
    auto: Sunrise,
  };

  const ThemeIcon = themeIcons[settings.theme];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <h1 className="text-lg font-semibold text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* User Profile Card */}
        {user && (
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <UserProfile size="lg" showGreeting={true} />
              <div className="flex items-center gap-1.5 text-track-green">
                <Cloud className="w-4 h-4" />
                <span className="text-2xs font-medium">Synced</span>
              </div>
            </div>
          </div>
        )}

        {/* Account Section */}
        <SettingsSection
          title="Account"
          description={user ? user.email || "Signed in" : "Sync across devices"}
        >
          {user ? (
            <SettingsRow
              label="Sign Out"
              action={
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              }
            />
          ) : (
            <SettingsRow
              label="Sign In"
              description="Sync your progress across devices"
              action={
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                  >
                    <LogIn className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4" />
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

        {/* Reminders */}
        <SettingsSection title="Reminders">
          <ReminderPicker
            reminders={settings.reminders}
            notificationPermission={settings.notificationPermission}
            onUpdate={updateReminders}
            onRequestPermission={requestNotificationPermission}
          />
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
                <SelectTrigger className="w-32 h-9 border-0 bg-secondary">
                  <div className="flex items-center gap-2">
                    <ThemeIcon className="w-4 h-4" strokeWidth={1.5} />
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
              />
            }
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data">
          <SettingsRow
            label="Export Data"
            description="Download backup file"
            action={
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
              </button>
            }
          />
          <SettingsRow
            label="Reset All Data"
            description="Delete all progress"
            action={
              <button
                onClick={() => setShowResetDialog(true)}
                className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            }
          />
        </SettingsSection>

        {/* Stats Summary */}
        <div className="card-elevated p-4 bg-gradient-to-br from-track-blue/5 to-track-purple/5">
          <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Your Progress
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {totalChaptersRead}
              </p>
              <p className="text-2xs text-muted-foreground">chapters read</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {streakCount}
              </p>
              <p className="text-2xs text-muted-foreground">day streak</p>
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
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
