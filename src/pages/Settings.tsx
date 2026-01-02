import { useState } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { SettingsSection, SettingsRow } from "@/components/SettingsSection";
import { ReminderPicker } from "@/components/ReminderPicker";
import { useSettings } from "@/hooks/useSettings";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useAuth } from "@/contexts/AuthContext";
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
  Trash2,
  Download,
  Info,
  User,
  LogOut,
  LogIn,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const {
    settings,
    updateSettings,
    updateReminders,
    requestNotificationPermission,
  } = useSettings();

  const { totalChaptersRead, streakCount, resetProgress } = useCloudProgress();
  const { user, signOut } = useAuth();
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
    toast.success("Signed out successfully");
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[settings.theme];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-5 h-16 flex items-center">
          <h1 className="text-xl font-semibold font-serif text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Account Section */}
        <SettingsSection
          title="Account"
          description={user ? "Manage your account" : "Sign in to sync across devices"}
        >
          {user ? (
            <>
              <SettingsRow
                label="Email"
                description={user.email || "No email"}
                action={
                  <div className="flex items-center gap-2 text-success">
                    <Cloud className="w-4 h-4" />
                    <span className="text-xs font-medium">Synced</span>
                  </div>
                }
              />
              <SettingsRow
                label="Sign Out"
                description="Sign out of your account"
                action={
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
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
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              }
            />
          )}
        </SettingsSection>

        {/* Reminders */}
        <SettingsSection
          title="Reminders"
          description="Set daily reading reminders"
        >
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
            description="Choose your preferred theme"
            action={
              <Select
                value={settings.theme}
                onValueChange={(value: "light" | "dark" | "system") =>
                  updateSettings({ theme: value })
                }
              >
                <SelectTrigger className="w-28 h-9">
                  <div className="flex items-center gap-2">
                    <ThemeIcon className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <SettingsRow
            label="Haptic Feedback"
            description="Vibrate on actions (mobile)"
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
            description="Download your reading progress"
            action={
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/15 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            }
          />
          <SettingsRow
            label="Reset All Data"
            description="Clear all progress and settings"
            action={
              <button
                onClick={() => setShowResetDialog(true)}
                className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/15 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Reset
              </button>
            }
          />
        </SettingsSection>

        {/* Stats Summary */}
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Your Stats</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Total Chapters</p>
              <p className="text-lg font-semibold text-foreground">
                {totalChaptersRead}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Current Streak</p>
              <p className="text-lg font-semibold text-foreground">
                {streakCount} days
              </p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">Scripture Daily v1.0</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Based on the Horner Bible Reading Plan
          </p>
        </div>
      </main>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your reading progress and
              settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Settings;
