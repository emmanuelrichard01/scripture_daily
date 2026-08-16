import { Toaster as Sonner } from "sonner";
import { useSettings } from "@/hooks/useSettings";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast host, themed from the app's own settings.
 *
 * Previously read from `next-themes`, whose provider was never mounted — so
 * `useTheme()` always fell back to "system" and toasts ignored an explicit
 * light/dark choice. `resolvedTheme` is the value the document actually uses.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useSettings();
  const sonnerTheme =
    resolvedTheme === "sepia" || resolvedTheme === "light" ? "light" : "dark";

  return (
    <Sonner
      theme={sonnerTheme}
      position="top-center"
      // Above the bottom nav, and clear of the iOS home indicator.
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
        },
      }}
      {...props}
    />
  );
}
