import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, TriangleAlert } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the default panel. Receives a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Hook for reporting to an error service. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors so a single bad component cannot blank the app.
 *
 * The app previously had no boundary at all, which is why an undefined icon
 * reference on the sign-in page presented as a white screen with nothing in the
 * UI to suggest what went wrong or how to recover.
 *
 * Class-based because React exposes no hook equivalent of `componentDidCatch`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    // Kept: without a reporting backend this is the only trace of a prod crash.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private readonly reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="min-h-dvh bg-background flex flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <TriangleAlert className="h-7 w-7" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Your reading progress is saved on this device and was not affected.
            Try again, or reload the app.
          </p>
        </div>

        {import.meta.env.DEV && (
          <pre className="max-w-full overflow-x-auto rounded-xl bg-secondary p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}

        <div className="flex gap-3">
          <Button onClick={this.reset} variant="default" className="gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            onClick={() => window.location.assign("/")}
            variant="outline"
            className="rounded-xl"
          >
            Back to today
          </Button>
        </div>
      </div>
    );
  }
}
