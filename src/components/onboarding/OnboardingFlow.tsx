import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Moon, Sparkles, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { readingLists } from "@/lib/readingPlan";
import { useSettings } from "@/hooks/useSettings";
import { TRANSLATIONS, type ThemePreference, type TranslationId } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * Clean & elevated 4-step interactive onboarding & setup walkthrough.
 *
 * Step 0: Ten Streams (The 10-Track Halo)
 * Step 1: Dynamic Pairings (Asynchronous Velocities)
 * Step 2: Position Over Calendar (Zero-Guilt Bookmarks)
 * Step 3: Personalize Setup (Translation & Theme)
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [simulatedDay, setSimulatedDay] = useState<"steady" | "missed">("steady");
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const isLast = step === 3;

  const finish = (destination?: string) => {
    onComplete();
    if (destination) navigate(destination);
  };

  const selectedList = readingLists[selectedTrackIndex];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground selection:bg-primary/20">
      {/* ── Top Bar ── */}
      <header className="safe-top flex h-14 items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-2">
          <img
            src="/icon-192.png"
            alt="Scripture Daily logo"
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-contain"
          />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Scripture Daily
          </span>
        </div>

        {!isLast ? (
          <button
            type="button"
            onClick={() => finish()}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring cursor-pointer"
          >
            Skip
          </button>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">Step 4 of 4</span>
        )}
      </header>

      {/* ── Main Step Content ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 sm:px-6 py-4 text-center w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full flex flex-col items-center"
          >
            {/* Step 0: The 10-Track Halo */}
            {step === 0 && (
              <>
                <InteractiveHaloArt
                  selectedIndex={selectedTrackIndex}
                  onSelect={setSelectedTrackIndex}
                />
                <h1 className="mt-8 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                  Ten chapters. Ten streams.
                </h1>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xs">
                  Professor Horner’s system reads across ten biblical genres every single day, each advancing at its own pace.
                </p>

                <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/50 px-3.5 py-2 text-xs font-semibold">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: `hsl(var(${selectedList.colorVar}))`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-foreground">
                    List {selectedList.id}: {selectedList.name}
                  </span>
                  <span className="text-muted-foreground">· {selectedList.totalChapters} ch</span>
                </div>
              </>
            )}

            {/* Step 1: Asynchronous Velocities */}
            {step === 1 && (
              <>
                <InteractiveVelocityArt />
                <h1 className="mt-8 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                  Pairings that never repeat.
                </h1>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xs">
                  Because lists differ in length (from 28 to 250 chapters), your daily 10-chapter combination will never repeat for years.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2 w-full text-center">
                  <div className="surface p-2.5">
                    <p className="font-display text-base font-bold">28 ch</p>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                      Acts · 13×/yr
                    </p>
                  </div>
                  <div className="surface p-2.5">
                    <p className="font-display text-base font-bold">89 ch</p>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                      Gospels · 4×/yr
                    </p>
                  </div>
                  <div className="surface p-2.5">
                    <p className="font-display text-base font-bold">250 ch</p>
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                      Prophets · 1.5×/yr
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Zero-Guilt Bookmarks */}
            {step === 2 && (
              <>
                <InteractiveBookmarkArt
                  mode={simulatedDay}
                  onToggle={() => setSimulatedDay((m) => (m === "steady" ? "missed" : "steady"))}
                />
                <h1 className="mt-8 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                  Zero guilt. Zero backlog.
                </h1>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xs">
                  Your place is kept per list, never by the calendar date. If life gets busy, you pick up right where you left off.
                </p>
              </>
            )}

            {/* Step 3: Setup Preferences */}
            {step === 3 && (
              <div className="w-full text-left">
                <div className="mb-5 text-center">
                  <span className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-secondary text-primary font-bold text-sm mb-3">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                    Personalize Setup
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Choose your default translation and reading theme.
                  </p>
                </div>

                <div className="space-y-4 surface p-4 sm:p-5">
                  {/* Translation Selection */}
                  <div>
                    <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Bible Translation
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["ESV", "NIV", "NLT", "KJV"] as TranslationId[]).map((code) => {
                        const isSelected = settings.translation === code;
                        const meta = TRANSLATIONS.find((t) => t.id === code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => updateSettings({ translation: code })}
                            className={cn(
                              "flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-bold transition-all focus-ring cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-secondary/40 text-foreground hover:bg-secondary",
                            )}
                          >
                            <span>{code}</span>
                            <span
                              className={cn(
                                "text-[0.6rem] font-normal mt-0.5",
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {meta?.style.split(",")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <label className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Reading Theme
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "light", label: "Ivory", icon: Sun },
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "sepia", label: "Sepia", icon: BookOpen },
                        { id: "midnight", label: "OLED", icon: Sparkles },
                      ].map((t) => {
                        const isSelected = settings.theme === t.id;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => updateSettings({ theme: t.id as ThemePreference })}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-all focus-ring cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="text-[0.68rem]">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Navigation Footer ── */}
      <footer className="safe-bottom flex flex-col items-center gap-4 px-5 sm:px-6 pb-6 pt-2 max-w-md mx-auto w-full">
        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Walkthrough steps">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1}`}
              onClick={() => setStep(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 focus-ring cursor-pointer",
                index === step ? "w-6 bg-primary" : "w-1.5 bg-primary/20 hover:bg-primary/40",
              )}
            />
          ))}
        </div>

        {isLast ? (
          <div className="w-full space-y-2">
            <Button
              onClick={() => finish()}
              className="h-12 w-full rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
            >
              Start Reading Today
            </Button>
            <Button
              variant="ghost"
              onClick={() => finish("/auth")}
              className="h-10 w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Sign in to sync across devices
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setStep((value) => value + 1)}
            className="h-12 w-full gap-2 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </footer>
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
  const RADIUS = 72;

  return (
    <div className="relative mx-auto flex h-[170px] w-[170px] items-center justify-center">
      <svg
        className="absolute inset-0"
        width="170"
        height="170"
        viewBox="0 0 170 170"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="85" cy="85" r={RADIUS} stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="3 3" />
        {readingLists.map((list, index) => {
          const angle = (index / readingLists.length) * Math.PI * 2 - Math.PI / 2;
          const isSelected = index === selectedIndex;
          const cx = 85 + Math.cos(angle) * RADIUS;
          const cy = 85 + Math.sin(angle) * RADIUS;

          return (
            <g
              key={list.id}
              onClick={() => onSelect(index)}
              className="cursor-pointer"
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 9 : 5.5}
                fill={`hsl(var(${list.colorVar}))`}
                className="transition-all duration-200"
              />
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  stroke={`hsl(var(${list.colorVar}))`}
                  strokeWidth="2"
                  fill="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card p-2">
        <img
          src="/icon-192.png"
          alt="Scripture Daily"
          width={44}
          height={44}
          className="h-11 w-11 rounded-lg object-contain"
        />
      </div>
    </div>
  );
}

function InteractiveVelocityArt() {
  const longest = Math.max(...readingLists.map((list) => list.totalChapters));

  return (
    <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1.5">
        {readingLists.map((list) => {
          const pct = (list.totalChapters / longest) * 100;
          return (
            <div key={list.id} className="flex items-center gap-2">
              <span className="w-4 text-right text-[0.62rem] font-bold text-muted-foreground tabular-nums">
                {list.id}
              </span>
              <div className="h-2 flex-1 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(12, pct)}%`,
                    backgroundColor: `hsl(var(${list.colorVar}))`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-[0.6rem] font-semibold text-muted-foreground tabular-nums">
                {list.totalChapters}c
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveBookmarkArt({
  mode,
  onToggle,
}: {
  mode: "steady" | "missed";
  onToggle: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-border bg-card p-4 text-left">
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">List 1 · Gospels</span>
          <span className="font-bold text-foreground">Matthew 4</span>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">List 2 · Pentateuch</span>
          <span className="font-bold text-foreground">Genesis 4</span>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">List 3 · Romans</span>
          <span className="font-bold text-foreground">Romans 4</span>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/70 p-2.5 text-center text-xs">
        {mode === "steady" ? (
          <p className="text-muted-foreground text-[0.72rem]">
            Every reading session advances your 10 bookmarks by 1 chapter.
          </p>
        ) : (
          <p className="text-success font-semibold text-[0.72rem] flex items-center justify-center gap-1">
            <Check className="h-3 w-3" aria-hidden="true" />
            No missed days or guilt. Resume right at chapter 4.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-2.5 w-full rounded-lg border border-border bg-background py-1.5 text-center text-[0.68rem] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-ring"
      >
        {mode === "steady" ? "Tap to test: missed 3 days?" : "Tap to reset: regular pace"}
      </button>
    </div>
  );
}

