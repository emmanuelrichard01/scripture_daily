import { NavLink } from "react-router-dom";
import { BookMarked, CalendarClock, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Today", end: true },
  { to: "/progress", icon: BookMarked, label: "Progress", end: false },
  { to: "/history", icon: CalendarClock, label: "History", end: false },
  { to: "/community", icon: Users, label: "Friends", end: false },
  { to: "/settings", icon: Settings, label: "Settings", end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border/50"
      aria-label="Main"
    >
      <ul className="mx-auto flex h-[66px] max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 focus-ring",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* A filled pill behind the active icon rather than a top
                      rule — it survives the glass blur, which a 3px line
                      visually does not. */}
                  {isActive && (
                    <span
                      className="absolute inset-x-3 inset-y-1.5 rounded-xl bg-primary/10"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon
                    className="relative h-[21px] w-[21px] transition-transform duration-200 ease-spring"
                    strokeWidth={isActive ? 2.4 : 1.9}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "relative text-[10px] leading-none tracking-wide",
                      isActive ? "font-bold" : "font-semibold",
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
