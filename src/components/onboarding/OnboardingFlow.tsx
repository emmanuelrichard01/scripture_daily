import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readingLists } from "@/lib/readingPlan";
import { useSettings } from "@/hooks/useSettings";
import { type ThemePreference, type TranslationId } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * Premium 4-step interactive onboarding & setup walkthrough.
 *
 * Step 1: The 10-List Halo (Interactive list exploration)
 * Step 2: The 10 Genre Tracks (Why Horner's system is balanced)
 * Step 3: Position Over Date (Interactive demo showing zero-guilt bookmarking)
 * Step 4: Your Personal Setup (Directly select Translation, Theme, and Reminder)
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [simulatedDay, setSimulatedDay] = useState(1);
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const isLast = step === 3;

  const finish = (destination?: string) => {
    onComplete();
    if (destination) navigate(destination);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top Bar */}
      <div className="safe-top flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img
            src="/icon-192.png"
            alt="Scripture Daily"
            width={28}
            height={28}
            className="h-7 w-7 rounded-lg shadow-sm"
          />
          <span className="font-display text-sm font-bold tracking-tight">Scripture Daily</span>
        </div>

        {!isLast && (
          <button
            type="button"
            onClick={() => finish()}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
          >
            Skip
          </button>
        )}
      </div>

      {/* Main Slide Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {step === 0 && (
          <div className="w-full max-w-sm animate-rise">
            <InteractiveHaloArt
              selectedIndex={selectedTrackIndex}
              onSelect={setSelectedTrackIndex}
            />
            <h1 className="mt-8 font-display text-2xl font-bold leading-tight tracking-tight">
              Ten chapters a day.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Professor Grant Horner’s reading system takes you through the whole Bible across ten simultaneous tracks, cycling at independent speeds.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: `hsl(var(${readingLists[selectedTrackIndex].colorVar}))`,
                }}
              />
              <span>
                Track {selectedTrackIndex + 1}: {readingLists[selectedTrackIndex].name} ({readingLists[selectedTrackIndex].totalChapters} ch)
              </span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-sm animate-rise">
            <InteractiveListsArt />
            <h1 className="mt-8 font-display text-2xl font-bold leading-tight tracking-tight">
              Pairings that never repeat.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Because lists range from 28 chapters (Acts) to 250 chapters (Prophets), the exact combination of ten chapters you read today won’t repeat for years.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-sm animate-rise">
            <InteractivePaceArt
              simulatedDay={simulatedDay}
              onToggleDay={() => setSimulatedDay((d) => (d === 1 ? 5 : 1))}
            />
            <h1 className="mt-8 font-display text-2xl font-bold leading-tight tracking-tight">
              No guilt. No backlog.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your bookmarks are remembered per list, never by the calendar date. If you miss a day or a week, you pick up exactly where you left off.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-sm animate-rise text-left">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Personalize Your Setup
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Set your preferred translation and theme before starting.
              </p>
            </div>

            <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              {/* Translation Selection */}
              <div>
                <label className="mb-1.5 block text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  Default Translation
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["ESV", "NIV", "NLT", "KJV"] as TranslationId[]).map((code) => {
                    const isSelected = settings.translation === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => updateSettings({ translation: code })}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border py-2 text-xs font-bold transition-all focus-ring",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-secondary/40 text-foreground hover:bg-secondary",
                        )}
                      >
                        <span>{code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="mb-1.5 block text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reading Theme
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "light", label: "Ivory", icon: Sun },
                    { id: "dark", label: "OLED", icon: Moon },
                    { id: "sepia", label: "Sepia", icon: BookOpen },
                    { id: "midnight", label: "AMOLED", icon: Sparkles },
                  ].map((t) => {
                    const isSelected = settings.theme === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateSettings({ theme: t.id as ThemePreference })}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition-all focus-ring",
                          isSelected
                            ? "border-primary bg-primary/[0.08] text-primary shadow-sm"
                            : "border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-3xs font-bold">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="safe-bottom flex flex-col items-center gap-5 px-6 pb-8 pt-4">
        {/* Step Indicator Pills */}
        <div className="flex gap-2" role="tablist" aria-label="Walkthrough steps">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1}`}
              onClick={() => setStep(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out-expo focus-ring",
                index === step ? "w-8 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/40",
              )}
            />
          ))}
        </div>

        {isLast ? (
          <div className="w-full max-w-sm space-y-2">
            <Button
              onClick={() => finish()}
              className="h-13 w-full rounded-2xl text-base font-bold shadow-lg"
            >
              Start Reading Today
            </Button>
            <Button
              variant="ghost"
              onClick={() => finish("/auth")}
              className="h-11 w-full rounded-2xl text-xs font-semibold text-muted-foreground"
            >
              Sign in to enable cloud sync
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setStep((value) => value + 1)}
            className="h-13 w-full max-w-sm gap-2 rounded-2xl text-base font-bold shadow-lg"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── Interactive Visuals ────────────────────────────── */

function InteractiveHaloArt({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const RADIUS = 78;

  return (
    <div className="relative mx-auto flex h-[180px] w-[180px] items-center justify-center">
      <svg
        className="absolute inset-0"
        width="180"
        height="180"
        viewBox="0 0 180 180"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="90" cy="90" r={RADIUS} stroke="hsl(var(--border) / 0.6)" strokeWidth="1.5" strokeDasharray="3 3" />
        {readingLists.map((list, index) => {
          const angle = (index / readingLists.length) * Math.PI * 2 - Math.PI / 2;
          const isSelected = index === selectedIndex;
          const cx = 90 + Math.cos(angle) * RADIUS;
          const cy = 90 + Math.sin(angle) * RADIUS;

          return (
            <g
              key={list.id}
              onClick={() => onSelect(index)}
              className="cursor-pointer transition-transform duration-200 hover:scale-125"
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 10 : 6}
                fill={`hsl(var(${list.colorVar}))`}
                className="transition-all duration-300"
              />
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="13"
                  stroke={`hsl(var(${list.colorVar}))`}
                  strokeWidth="2"
                  fill="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-card p-3 shadow-md">
        <img
          src="/icon-192.png"
          alt="Scripture Daily"
          width={56}
          height={56}
          className="h-14 w-14 rounded-xl"
        />
      </div>
    </div>
  );
}

function InteractiveListsArt() {
  const longest = Math.max(...readingLists.map((list) => list.totalChapters));

  return (
    <div className="mx-auto rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <svg width="240" height="150" viewBox="0 0 240 150" fill="none" className="mx-auto" aria-hidden="true">
        {readingLists.map((list, index) => {
          const width = 28 + (list.totalChapters / longest) * 190;
          return (
            <g key={list.id}>
              <rect
                x="8"
                y={6 + index * 14}
                width={width}
                height="8"
                rx="4"
                fill={`hsl(var(${list.colorVar}))`}
                opacity={0.85}
              />
              <circle cx="12" cy={10 + index * 14} r="2.5" fill="hsl(var(--card))" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function InteractivePaceArt({
  simulatedDay,
  onToggleDay,
}: {
  simulatedDay: number;
  onToggleDay: () => void;
}) {
  return (
    <div className="mx-auto rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <svg width="240" height="110" viewBox="0 0 240 110" fill="none" className="mx-auto" aria-hidden="true">
        <path
          d="M20 70c26 0 26-40 52-40s26 40 52 40 26-40 52-40 26 40 44 40"
          stroke="hsl(var(--border))"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {[20, 72, 124, 176, 220].map((x, index) => {
          const isSkipped = index === 2 && simulatedDay === 1;
          return (
            <circle
              key={x}
              cx={x}
              cy={index % 2 === 0 ? 70 : 30}
              r={isSkipped ? 6 : 9}
              fill={isSkipped ? "hsl(var(--background))" : "hsl(var(--primary))"}
              stroke={isSkipped ? "hsl(var(--destructive))" : "none"}
              strokeWidth="2.5"
              strokeDasharray={isSkipped ? "3 3" : undefined}
            />
          );
        })}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleDay}
          className="h-8 rounded-xl text-3xs font-bold"
        >
          {simulatedDay === 1 ? "Simulate: Missed a day" : "Simulate: Regular pace"}
        </Button>
      </div>
    </div>
  );
}
