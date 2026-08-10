import { useContext } from "react";
import { SettingsContext, SettingsContextValue } from "@/contexts/SettingsContext";

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export type { Settings, ReminderSettings } from "@/contexts/SettingsContext";
