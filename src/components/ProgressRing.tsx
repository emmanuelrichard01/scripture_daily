import type { ReactNode } from "react";

interface ProgressRingProps {
  /** Completion, 0–100. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  isComplete?: boolean;
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 7,
  isComplete = false,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Draw the full circle, then hide the unfinished portion via dash offset.
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          stroke={isComplete ? "hsl(var(--success))" : "hsl(var(--primary))"}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
