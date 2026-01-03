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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex flex-col items-center justify-center gap-0.5 px-5 py-2 transition-colors text-muted-foreground"
              activeClassName="text-foreground"
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-2xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}