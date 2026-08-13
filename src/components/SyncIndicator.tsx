import { Check, CloudOff, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { formatRelativeTime } from "@/lib/date";
import type { SyncStatus } from "@/lib/syncEngine";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  isAuthenticated: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * A quiet report on where progress is stored.
 *
 * Deliberately understated: sync is background work, and the only state that
 * warrants the user's attention is a failure they can act on.
 */
export function SyncIndicator({
  status,
  lastSyncedAt,
  isAuthenticated,
  onRetry,
  className,
}: SyncIndicatorProps) {
  const base = cn("flex items-center gap-1.5 text-[11px] font-medium", className);

  if (!isAuthenticated) {
    return (
      <span className={cn(base, "text-muted-foreground")} role="status">
        <CloudOff className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        On this device
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          base,
          "rounded-md px-2 py-1 text-destructive transition-colors hover:bg-destructive/10 focus-ring",
        )}
      >
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Sync failed — retry
      </button>
    );
  }

  if (status === "offline") {
    return (
      <span className={cn(base, "text-muted-foreground")} role="status">
        <WifiOff className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        Offline — saved locally
      </span>
    );
  }

  if (status === "syncing" || status === "pending") {
    return (
      <span className={cn(base, "text-muted-foreground")} role="status" aria-live="polite">
        <Loader2
          className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        Syncing
      </span>
    );
  }

  return (
    <span className={cn(base, "text-muted-foreground")} role="status">
      <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} aria-hidden="true" />
      {lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt)}` : "Synced"}
    </span>
  );
}
