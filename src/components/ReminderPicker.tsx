import { Switch } from "@/components/ui/switch";
import type { ReminderSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface ReminderPickerProps {
  reminders: ReminderSettings;
  onChange: (updates: Partial<ReminderSettings>) => void;
}

const DAYS = [
  { value: 0, label: "S", full: "Sunday" },
  { value: 1, label: "M", full: "Monday" },
  { value: 2, label: "T", full: "Tuesday" },
  { value: 3, label: "W", full: "Wednesday" },
  { value: 4, label: "T", full: "Thursday" },
  { value: 5, label: "F", full: "Friday" },
  { value: 6, label: "S", full: "Saturday" },
] as const;

export function ReminderPicker({ reminders, onChange }: ReminderPickerProps) {
  const toggleDay = (day: number) => {
    const next = reminders.days.includes(day)
      ? reminders.days.filter((value) => value !== day)
      : [...reminders.days, day].sort((a, b) => a - b);

    // An empty selection would silently disable reminders while the switch
    // still read "on"; keep at least one day selected.
    if (next.length === 0) return;
    onChange({ days: next });
  };

  return (
    <div>
      <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Daily reminder</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {reminders.enabled
              ? `At ${reminders.time}, ${
                  reminders.days.length === 7
                    ? "every day"
                    : `${reminders.days.length} days a week`
                }`
              : "Off"}
          </p>
        </div>
        <Switch
          checked={reminders.enabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
          aria-label="Daily reminder"
        />
      </div>

      {reminders.enabled && (
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="reminder-time" className="text-sm font-medium">
              Time
            </label>
            <input
              id="reminder-time"
              type="time"
              value={reminders.time}
              onChange={(event) => onChange({ time: event.target.value })}
              className="h-11 rounded-xl border-0 bg-secondary px-3 text-sm tabular-nums focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Days</p>
            <div className="flex gap-1.5" role="group" aria-label="Reminder days">
              {DAYS.map((day) => {
                const isOn = reminders.days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    aria-pressed={isOn}
                    aria-label={day.full}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center rounded-xl text-xs font-bold transition-colors focus-ring",
                      isOn
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Reminders are sent in your device's timezone.
          </p>
        </div>
      )}
    </div>
  );
}
