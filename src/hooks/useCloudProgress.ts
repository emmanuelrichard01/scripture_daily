import { useContext } from "react";
import { ProgressContext, ProgressContextValue } from "@/contexts/ProgressContext";

export function useCloudProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useCloudProgress must be used within a ProgressProvider");
  }
  return context;
}
