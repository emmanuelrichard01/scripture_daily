import { useEffect, useRef, useState } from "react";

export function useReadingTimer(isActive: boolean) {
  const [seconds, setSeconds] = useState(0);
  const isDocumentVisible = useRef(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisible.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      if (isDocumentVisible.current) {
        setSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  const formatted =
    minutes > 0
      ? `${minutes}m ${remainingSecs}s`
      : `${remainingSecs}s`;

  return {
    seconds,
    formatted,
    reset: () => setSeconds(0),
  };
}
