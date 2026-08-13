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
 *
 * Every page previously hand-rolled this, which is why the bottom padding that
 * clears the nav bar varied between `pb-20`, `pb-24` and `pb-[88px]` — the
 * first of which left content stranded underneath the nav.
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
  const maxWidth = width === "narrow" ? "max-w-md" : "max-w-lg";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="glass safe-top sticky top-0 z-40 border-b border-border/50">
        <div className={cn("mx-auto flex h-14 items-center justify-between gap-3 px-5", maxWidth)}>
          <div className="flex min-w-0 items-center gap-1">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="-ml-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary active:scale-95 focus-ring"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <h1 className="truncate font-display text-xl font-semibold tracking-tight">
              {title}
            </h1>
          </div>

          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      </header>

      <main
        className={cn(
          // Bottom padding clears the 66px nav plus the iOS home indicator.
          "mx-auto px-5 pb-28 pt-6",
          maxWidth,
          className,
        )}
      >
        {description && (
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
