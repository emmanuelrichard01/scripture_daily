import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  action: ReactNode;
}

export function SettingsRow({ label, description, action }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
