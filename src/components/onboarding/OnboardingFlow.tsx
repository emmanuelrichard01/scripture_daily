import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readingLists } from "@/lib/readingPlan";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * First-run walkthrough.
 *
 * Each step carries a purpose-built illustration rather than a generic icon,
 * because the thing that needs explaining — ten independent lists advancing at
 * different rates — is genuinely spatial and hard to convey in a sentence.
 *
 * A plain step index rather than a carousel library: four static panels do not
 * justify Embla's bundle cost or its imperative API.
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      id: "welcome",
      art: <WelcomeArt />,
      title: "Ten chapters a day",
      body: "Professor Grant Horner's reading system takes you through the whole Bible, again and again, without ever losing your place.",
    },
    {
      id: "lists",
      art: <ListsArt />,
      title: "Ten lists, one chapter each",
      body: "Scripture is split across ten lists — Gospels, Pentateuch, Psalms, Proverbs and more. Each day you read one chapter from every list.",
    },
    {
      id: "combinations",
      art: <CombinationsArt />,
      title: "The pairings never repeat",
      body: "The lists run from 28 to 250 chapters, so they cycle at different rates. The particular ten chapters you read today won't recur for years.",
    },
    {
      id: "pace",
      art: <PaceArt />,
      title: "Miss a day? Just carry on",
      body: "Your place is remembered per list, never by the calendar. There's nothing to catch up on and no streak to repair — you pick up exactly where you stopped.",
    },
  ] as const;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const finish = (destination?: string) => {
    onComplete();
    if (destination) navigate(destination);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="safe-top flex h-14 items-center justify-end px-5">
        {!isLast && (
          <button
            type="button"
            onClick={() => finish()}
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
          >
            Skip
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        {/* Keyed so the illustration re-mounts and re-animates per step. */}
        <div key={current.id} className="animate-rise mb-10">
          {current.art}
        </div>

        <h1
          key={`${current.id}-title`}
          className="animate-rise mb-3 max-w-sm text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight"
          style={{ animationDelay: "60ms" }}
        >
          {current.title}
        </h1>

        <p
          key={`${current.id}-body`}
          className="animate-rise max-w-sm text-pretty leading-relaxed text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          {current.body}
        </p>
      </div>

      <div className="safe-bottom flex flex-col items-center gap-6 px-8 pb-10 pt-8">
        <div className="flex gap-2" role="tablist" aria-label="Walkthrough steps">
          {steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1}: ${item.title}`}
              onClick={() => setStep(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out-expo focus-ring",
                index === step ? "w-7 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/40",
              )}
            />
          ))}
        </div>

        {isLast ? (
          <div className="w-full max-w-xs space-y-2.5">
            <Button
              onClick={() => finish()}
              className="h-13 w-full rounded-2xl text-base font-bold shadow-md"
            >
              Start reading
            </Button>
            <Button
              variant="ghost"
              onClick={() => finish("/auth")}
              className="h-11 w-full rounded-2xl text-sm font-medium text-muted-foreground"
            >
              Create an account to sync
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setStep((value) => value + 1)}
            className="h-13 w-full max-w-xs gap-2 rounded-2xl text-base font-bold shadow-md"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── Illustrations ──────────────────────────────
 *
 * Inline SVG rather than image assets: they inherit theme colours through
 * `currentColor` and the CSS custom properties, stay crisp at any density, and
 * add nothing to the network payload.
 */

/**
 * The app mark itself, haloed by the ten list colours.
 *
 * The opening step is where the product introduces itself, so it leads with the
 * icon the user will see on their home screen rather than an abstract drawing —
 * it ties the walkthrough to the thing they just installed.
 */
function WelcomeArt() {
  const RADIUS = 74;

  return (
    <div className="relative flex h-[168px] w-[168px] items-center justify-center">
      {/* Ten dots on a ring, one per list, in list order. */}
      <svg
        className="absolute inset-0"
        width="168"
        height="168"
        viewBox="0 0 168 168"
        fill="none"
        aria-hidden="true"
      >
        {readingLists.map((list, index) => {
          // Start at 12 o'clock and step clockwise.
          const angle = (index / readingLists.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={list.id}
              cx={84 + Math.cos(angle) * RADIUS}
              cy={84 + Math.sin(angle) * RADIUS}
              r="6"
              fill={`hsl(var(${list.colorVar}))`}
            />
          );
        })}
      </svg>

      <img
        src="/icon-192.png"
        alt=""
        width={96}
        height={96}
        className="h-24 w-24 rounded-[1.4rem] shadow-lg"
      />
    </div>
  );
}

/** Ten stacked bars at proportional lengths — the lists and their sizes. */
function ListsArt() {
  const longest = Math.max(...readingLists.map((list) => list.totalChapters));

  return (
    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden="true">
      {readingLists.map((list, index) => {
        const width = 24 + (list.totalChapters / longest) * 152;
        return (
          <g key={list.id}>
            <rect
              x="12"
              y={8 + index * 13}
              width={width}
              height="8"
              rx="4"
              fill={`hsl(var(${list.colorVar}))`}
            />
            {/* The chapter you read today: the leading edge of every list. */}
            <circle cx="16" cy={12 + index * 13} r="2.5" fill="hsl(var(--card))" />
          </g>
        );
      })}
    </svg>
  );
}

/** Offset markers drifting apart — why combinations don't repeat. */
function CombinationsArt() {
  const rows = [0, 1, 2, 3, 4];

  return (
    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden="true">
      {rows.map((row) => (
        <g key={row}>
          <line
            x1="12"
            y1={22 + row * 24}
            x2="188"
            y2={22 + row * 24}
            stroke="hsl(var(--border))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {[0, 1, 2, 3].map((tick) => (
            <circle
              key={tick}
              // Each list advances at its own rate, so the markers fan out.
              // Spacing is bounded so the widest row still lands inside the
              // line rather than clipping at the viewBox edge.
              cx={22 + tick * 42 + row * 8}
              cy={22 + row * 24}
              r="5"
              fill={`hsl(var(${readingLists[row * 2].colorVar}))`}
              opacity={tick === 0 ? 1 : 0.75 - tick * 0.15}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** A path with a gap that simply continues — missing a day costs nothing. */
function PaceArt() {
  return (
    <svg width="200" height="130" viewBox="0 0 200 130" fill="none" aria-hidden="true">
      <path
        d="M16 88c22 0 22-46 44-46s22 46 44 46 22-46 44-46 22 46 36 46"
        stroke="hsl(var(--border))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[16, 60, 104, 148, 184].map((x, index) => {
        const skipped = index === 2;
        return (
          <circle
            key={x}
            cx={x}
            cy={index % 2 === 0 ? 88 : 42}
            r={skipped ? 6 : 8}
            fill={skipped ? "hsl(var(--background))" : "hsl(var(--primary))"}
            stroke={skipped ? "hsl(var(--border))" : "none"}
            strokeWidth="2.5"
            strokeDasharray={skipped ? "3 3" : undefined}
          />
        );
      })}
      <text
        x="104"
        y="122"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="11"
        fontWeight="600"
      >
        a missed day, and the path continues
      </text>
    </svg>
  );
}
