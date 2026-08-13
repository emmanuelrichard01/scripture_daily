import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h2
        id={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>
      {description && (
        <p className="mb-2 px-1 text-xs text-muted-foreground">{description}</p>
      )}
      {/* `divide-y` rather than per-row borders, so the first and last rows sit
          flush against the card's rounded corners. */}
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {children}
      </div>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  action: ReactNode;
}

export function SettingsRow({ label, description, action }: SettingsRowProps) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">{action}</div>
    </div>
  );
}
