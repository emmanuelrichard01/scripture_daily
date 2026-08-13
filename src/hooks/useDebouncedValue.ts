import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, resetting on every change.
 *
 * Used to keep search-as-you-type from firing a query per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
