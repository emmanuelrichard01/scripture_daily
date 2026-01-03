import { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({
  title,
  description,
}: SettingsSectionProps & { children: ReactNode }) {
  const { children } = arguments[0];
  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-2xs text-muted-foreground mt-0.5">{description}</p>
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
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-2xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}