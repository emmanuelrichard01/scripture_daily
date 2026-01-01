import { Home, BookOpen, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { to: "/", icon: Home, label: "Today" },
  { to: "/progress", icon: BookOpen, label: "Progress" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              activeClassName="text-primary bg-primary/10"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
