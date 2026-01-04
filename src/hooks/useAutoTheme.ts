import { useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";

interface SunTimes {
  sunrise: number; // hours in 24h format
  sunset: number;
}

// Approximate sunrise/sunset based on month (simplified for most locations)
const getApproximateSunTimes = (): SunTimes => {
  const month = new Date().getMonth();
  
  // Simplified sun times that work for most temperate regions
  const sunTimes: Record<number, SunTimes> = {
    0: { sunrise: 7.5, sunset: 17 },   // Jan
    1: { sunrise: 7, sunset: 17.5 },   // Feb
    2: { sunrise: 6.5, sunset: 18 },   // Mar
    3: { sunrise: 6, sunset: 19 },     // Apr
    4: { sunrise: 5.5, sunset: 20 },   // May
    5: { sunrise: 5.5, sunset: 20.5 }, // Jun
    6: { sunrise: 5.5, sunset: 20.5 }, // Jul
    7: { sunrise: 6, sunset: 20 },     // Aug
    8: { sunrise: 6.5, sunset: 19 },   // Sep
    9: { sunrise: 7, sunset: 18 },     // Oct
    10: { sunrise: 7, sunset: 17 },    // Nov
    11: { sunrise: 7.5, sunset: 16.5 }, // Dec
  };
  
  return sunTimes[month] || { sunrise: 6, sunset: 18 };
};

export function useAutoTheme() {
  const { settings, updateSettings } = useSettings();

  const shouldBeDark = useCallback((): boolean => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const { sunrise, sunset } = getApproximateSunTimes();
    
    // Dark mode between sunset and sunrise
    return currentHour < sunrise || currentHour >= sunset;
  }, []);

  const applyAutoTheme = useCallback(() => {
    if (settings.theme !== "auto") return;
    
    const root = document.documentElement;
    const isDark = shouldBeDark();
    root.classList.toggle("dark", isDark);
  }, [settings.theme, shouldBeDark]);

  // Check and apply theme periodically when in auto mode
  useEffect(() => {
    if (settings.theme !== "auto") return;

    // Apply immediately
    applyAutoTheme();

    // Check every 5 minutes
    const interval = setInterval(applyAutoTheme, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.theme, applyAutoTheme]);

  // Apply theme based on setting
  useEffect(() => {
    const root = document.documentElement;

    if (settings.theme === "auto") {
      applyAutoTheme();
    } else if (settings.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);

      // Listen for system changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        if (settings.theme === "system") {
          root.classList.toggle("dark", e.matches);
        }
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      root.classList.toggle("dark", settings.theme === "dark");
    }
  }, [settings.theme, applyAutoTheme]);

  return {
    setAutoTheme: () => updateSettings({ theme: "auto" }),
    isAutoTheme: settings.theme === "auto",
    isDarkNow: shouldBeDark(),
  };
}
