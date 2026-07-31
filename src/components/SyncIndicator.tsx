import { Cloud, CloudOff, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "@/hooks/useCloudProgress";

interface SyncIndicatorProps {
  isSyncing?: boolean;
  isAuthenticated: boolean;
  status?: SyncStatus;
  lastSyncedAt?: Date | null;
  onRetry?: () => void;
  className?: string;
}

const relativeTime = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export function SyncIndicator({
  isSyncing,
  isAuthenticated,
  status,
  lastSyncedAt,
  onRetry,
  className,
}: SyncIndicatorProps) {
  const resolved: SyncStatus =
    status ?? (!isAuthenticated ? "local" : isSyncing ? "syncing" : "idle");

  const base = "flex items-center gap-1 text-2xs transition-colors";

  if (resolved === "local") {
    return (
      <div
        className={cn(base, "text-muted-foreground", className)}
        role="status"
        aria-live="polite"
      >
        <CloudOff className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
        <span>Saved on this device</span>
      </div>
    );
  }

  if (resolved === "syncing") {
    return (
      <div
        className={cn(base, "text-muted-foreground", className)}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span>Syncing</span>
      </div>
    );
  }

  if (resolved === "offline") {
    return (
      <div
        className={cn(base, "text-muted-foreground", className)}
        role="status"
        aria-live="polite"
      >
        <WifiOff className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
        <span>Offline — will sync later</span>
      </div>
    );
  }

  if (resolved === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          base,
          "text-destructive rounded-md px-1.5 py-1 min-h-[28px] hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className
        )}
        aria-label="Sync failed. Retry now."
      >
        <RefreshCw className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
        <span>Sync failed — retry</span>
      </button>
    );
  }

  return (
    <div
      className={cn(base, "text-success", className)}
      role="status"
      aria-live="polite"
    >
      <Cloud className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
      <span>
        Synced{lastSyncedAt ? ` · ${relativeTime(lastSyncedAt)}` : ""}
      </span>
    </div>
  );
}
