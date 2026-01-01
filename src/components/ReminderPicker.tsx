import { ReminderSettings } from "@/hooks/useSettings";
import { Switch } from "@/components/ui/switch";
import { Bell, Clock } from "lucide-react";

interface ReminderPickerProps {
  reminders: ReminderSettings;
  notificationPermission: NotificationPermission | "default";
  onUpdate: (updates: Partial<ReminderSettings>) => void;
  onRequestPermission: () => Promise<NotificationPermission>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ReminderPicker({
  reminders,
  notificationPermission,
  onUpdate,
  onRequestPermission,
}: ReminderPickerProps) {
  const handleEnableChange = async (enabled: boolean) => {
    if (enabled && notificationPermission !== "granted") {
      const permission = await onRequestPermission();
      if (permission !== "granted") {
        return;
      }
    }
    onUpdate({ enabled });
  };

  const toggleDay = (day: number) => {
    const days = reminders.days.includes(day)
      ? reminders.days.filter((d) => d !== day)
      : [...reminders.days, day].sort();
    onUpdate({ days });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Daily Reminders</p>
            <p className="text-sm text-muted-foreground">
              {reminders.enabled
                ? `Reminding at ${reminders.time}`
                : "Get reminded to read"}
            </p>
          </div>
        </div>
        <Switch
          checked={reminders.enabled}
          onCheckedChange={handleEnableChange}
        />
      </div>

      {reminders.enabled && (
        <>
          {/* Time Picker */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <input
              type="time"
              value={reminders.time}
              onChange={(e) => onUpdate({ time: e.target.value })}
              className="bg-transparent text-foreground font-medium focus:outline-none"
            />
          </div>

          {/* Days Picker */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Remind me on</p>
            <div className="flex gap-2">
              {DAYS.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleDay(index)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    reminders.days.includes(index)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {notificationPermission === "denied" && (
        <p className="text-sm text-destructive">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}
    </div>
  );
}
