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
          "flex items-center gap-1 text-2xs text-muted-foreground",
          className
        )}
      >
        <CloudOff className="w-3 h-3" strokeWidth={1.5} />
        <span>Local</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-2xs transition-colors",
        isSyncing ? "text-muted-foreground" : "text-success",
        className
      )}
    >
      {isSyncing ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" strokeWidth={1.5} />
          <span>Synced</span>
        </>
      )}
    </div>
  );
}