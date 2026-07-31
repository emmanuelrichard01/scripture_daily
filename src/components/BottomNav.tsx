import { Home, List, Clock, Settings, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { to: "/", icon: Home, label: "Today" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/lists", icon: List, label: "Lists" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-stretch justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-1 py-2 rounded-xl text-muted-foreground transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              activeClassName="text-foreground [&_[data-active-dot]]:opacity-100 [&_[data-active-dot]]:scale-100"
              aria-label={item.label}
            >
              <span
                data-active-dot
                aria-hidden="true"
                className="absolute top-1 h-1 w-6 rounded-full bg-foreground opacity-0 scale-50 transition-all duration-200 motion-reduce:transition-none"
              />
              <item.icon className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-2xs font-medium leading-none">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
