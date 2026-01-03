import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatsCard({
  icon,
  label,
  value,
  sublabel,
}: StatsCardProps) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-semibold text-foreground">
              {value}
            </p>
            {sublabel && (
              <p className="text-xs text-muted-foreground">{sublabel}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}