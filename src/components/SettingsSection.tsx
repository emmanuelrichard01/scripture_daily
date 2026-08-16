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
        className="mb-2.5 ml-2 px-1 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground"
      >
        {title}
      </h2>
      {description && (
        <p className="mb-3 ml-2 px-1 text-[0.8rem] text-muted-foreground">{description}</p>
      )}
      <div className="inset-group">
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
    <div className="flex min-h-[4.5rem] items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-secondary/20">
      <div className="min-w-0">
        <p className="text-[0.95rem] font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-[0.75rem] text-muted-foreground font-medium">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center">{action}</div>
    </div>
  );
}
