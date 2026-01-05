import { Home, BookOpen, List, Clock, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { to: "/", icon: Home, label: "Today" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/lists", icon: List, label: "Lists" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] px-4 py-2 transition-colors text-muted-foreground rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              activeClassName="text-foreground"
              aria-label={item.label}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-2xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}