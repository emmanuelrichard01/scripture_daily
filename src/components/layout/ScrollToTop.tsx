import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll position on navigation.
 *
 * A single-page app keeps the window's scroll offset across route changes, so
 * moving from a scrolled History page to Settings would otherwise land the user
 * partway down a page they just opened.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
