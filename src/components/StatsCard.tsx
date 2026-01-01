import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "primary" | "success" | "accent";
}

export function StatsCard({
  icon,
  label,
  value,
  sublabel,
  variant = "default",
}: StatsCardProps) {
  return (
    <div className="card-elevated p-5 hover-lift transition-all duration-300">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            variant === "primary" && "bg-primary/10 text-primary",
            variant === "success" && "bg-success/10 text-success",
            variant === "accent" && "bg-accent/20 text-accent-foreground",
            variant === "default" && "bg-secondary text-secondary-foreground"
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-semibold text-foreground font-serif">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
