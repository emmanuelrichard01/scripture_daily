import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
  isSyncing: boolean;
  isAuthenticated: boolean;
  className?: string;
}

export function SyncIndicator({
  isSyncing,
  isAuthenticated,
  className,
}: SyncIndicatorProps) {
  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local only</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        isSyncing ? "text-primary" : "text-success",
        className
      )}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <Cloud className="w-3.5 h-3.5" />
          <span>Synced</span>
        </>
      )}
    </div>
  );
}
