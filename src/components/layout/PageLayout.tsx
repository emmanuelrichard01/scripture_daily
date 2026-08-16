import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  /** Page title. Rendered as the page's only `h1`. */
  title: ReactNode;
  /** Optional line beneath the title, inside the scrolling content. */
  description?: ReactNode;
  /** Shown at the right of the header bar. */
  action?: ReactNode;
  showBack?: boolean;
  children: ReactNode;
  /** Constrains the main column. Today's list is narrower than the data pages. */
  width?: "narrow" | "default";
  className?: string;
}

/**
 * Shared page chrome: glass header, constrained column, bottom nav.
 */
export function PageLayout({
  title,
  description,
  action,
  showBack = false,
  children,
  width = "default",
  className,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const maxWidth = width === "narrow" ? "max-w-md" : "max-w-xl";

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-primary/20">
      <header className="glass safe-top sticky top-0 z-40">
        <div className={cn("mx-auto flex h-14 items-center justify-between gap-3 px-6", maxWidth)}>
          <div className="flex min-w-0 items-center">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary active:scale-90 focus-ring"
                aria-label="Go back"
              >
                <ArrowLeft className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      </header>

      <main
        className={cn(
          // Bottom padding clears the 68px nav pill + extra space + iOS home indicator.
          "mx-auto flex w-full flex-1 flex-col px-6 pb-40 pt-4",
          maxWidth,
          className,
        )}
      >
        <div className="mb-10 animate-rise">
          <h1 className="font-display text-[2.75rem] leading-none font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-[1.05rem] leading-relaxed text-muted-foreground font-medium">{description}</p>
          )}
        </div>
        <div className="flex flex-col gap-6 w-full relative">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
