import { cn } from "@/lib/utils";

/**
 * The neutral loading state for route suspense and auth checks.
 *
 * Branded rather than a bare spinner, and deliberately calm: it appears for a
 * few hundred milliseconds, and a skeleton of a page the user may not even be
 * navigating to reads as broken layout rather than as progress.
 *
 * The mark fades in after a beat, so a fast load shows nothing at all instead
 * of a flash of loading UI.
 */
export function FullPageSpinner({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center gap-6 bg-background",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>

      <div
        className="flex flex-col items-center gap-5 opacity-0"
        style={{ animation: "rise 400ms var(--ease-out) 220ms forwards" }}
        aria-hidden="true"
      >
        <img
          src="/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 rounded-2xl shadow-md"
        />

        {/* A determinate-looking sliver rather than a spinner — it reads as
            progress rather than as an indefinite wait. */}
        <div className="h-[3px] w-24 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 rounded-full bg-primary" style={{ animation: "slide 1.1s ease-in-out infinite" }} />
        </div>
      </div>

      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
