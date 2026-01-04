import { useState } from "react";
import { Calendar, ChevronRight, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StartDatePickerProps {
  currentStartDate: string;
  onUpdateStartDate: (date: string) => void;
}

export function StartDatePicker({ currentStartDate, onUpdateStartDate }: StartDatePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentStartDate);

  const presetOptions = [
    { label: "Start Fresh Today", value: new Date().toISOString().split("T")[0], description: "Begin from day 1" },
    { label: "January 1st", value: `${new Date().getFullYear()}-01-01`, description: "Align with calendar year" },
    { label: "Custom Date", value: "custom", description: "Pick any start date" },
  ];

  const handleSave = () => {
    onUpdateStartDate(selectedDate);
    setIsExpanded(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="card-elevated overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-track-green/10 flex items-center justify-center">
            <Calendar className="w-4.5 h-4.5 text-track-green" strokeWidth={1.5} />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Reading Start Date</p>
            <p className="text-2xs text-muted-foreground">
              {formatDisplayDate(currentStartDate)}
            </p>
          </div>
        </div>
        <ChevronRight 
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )} 
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-border/50 pt-4">
          <p className="text-2xs text-muted-foreground">
            Choose when your reading journey begins. This affects your day-of-year calculation 
            while maintaining Horner's reading system.
          </p>

          <div className="space-y-2">
            {presetOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value === "custom") {
                    // Show date input
                    const input = document.getElementById("custom-date-input");
                    input?.focus();
                  } else {
                    setSelectedDate(option.value);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                  selectedDate === option.value
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{option.label}</p>
                  <p className="text-2xs text-muted-foreground">{option.description}</p>
                </div>
                {selectedDate === option.value && option.value !== "custom" && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Custom date input */}
          <div className="flex gap-2">
            <input
              id="custom-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="flex-1 px-3 py-2 rounded-xl bg-secondary text-sm text-foreground border-0 focus:ring-2 focus:ring-primary/20"
            />
            <Button
              onClick={handleSave}
              size="sm"
              className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update
            </Button>
          </div>

          <p className="text-2xs text-muted-foreground italic">
            Note: Your reading progress will be preserved. Only the day calculation changes.
          </p>
        </div>
      )}
    </div>
  );
}
