import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMediumDate, isISODate, readingDayNumber, todayISO, type ISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StartDatePickerProps {
  startDate: ISODate;
  onChange: (date: ISODate) => void;
}

/**
 * Sets the date the reading journey began.
 *
 * This affects only the displayed "Day N" counter and the per-day average — it
 * never moves anyone's place in a list, because positions are derived from
 * chapters completed rather than from the calendar. The copy says so, since the
 * obvious fear when changing this is losing progress.
 */
export function StartDatePicker({ startDate, onChange }: StartDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(startDate);

  const today = todayISO();
  const presets = [
    { label: "Today", value: today },
    { label: "Start of this year", value: `${today.slice(0, 4)}-01-01` },
  ];

  const save = () => {
    if (!isISODate(draft)) {
      toast.error("Pick a valid date");
      return;
    }
    if (draft > today) {
      toast.error("Your start date can't be in the future");
      return;
    }
    onChange(draft);
    setIsOpen(false);
    toast.success(`Now on day ${readingDayNumber(draft, today).toLocaleString()}`);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setDraft(startDate);
          setIsOpen((open) => !open);
        }}
        aria-expanded={isOpen}
        className="flex min-h-[60px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary/40 focus-ring"
      >
        <span>
          <span className="block text-sm font-medium">Start date</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatMediumDate(startDate)}
            <span aria-hidden="true"> · </span>
            day {readingDayNumber(startDate, today).toLocaleString()}
          </span>
        </span>
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-90",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border/60 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Only the day counter and your daily average change. Your place in each
            list is untouched.
          </p>

          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setDraft(preset.value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-ring",
                  draft === preset.value
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <label className="sr-only" htmlFor="start-date-input">
              Custom start date
            </label>
            <input
              id="start-date-input"
              type="date"
              value={draft}
              max={today}
              onChange={(event) => setDraft(event.target.value)}
              className="h-11 flex-1 rounded-xl border-0 bg-secondary px-3 text-sm focus:ring-2 focus:ring-primary/30"
            />
            <Button onClick={save} className="h-11 rounded-xl font-semibold">
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
