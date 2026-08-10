import { Home, List, Clock, Settings, Trophy } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Today" },
  { to: "/progress", icon: Trophy, label: "Progress" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/lists", icon: List, label: "Lists" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-bottom shadow-[0_-4px_24px_hsl(0,0%,0%,0.02)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-stretch justify-around h-[68px] px-2">
          {navItems.map((item) => {
            // Need to match exactly or start with for sub-routes, but / needs exact match
            const isActive = item.to === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-1 py-1 rounded-2xl transition-colors duration-200 focus-ring",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/50"
                )}
                aria-label={item.label}
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <item.icon 
                    className="w-[22px] h-[22px] transition-transform duration-300" 
                    strokeWidth={isActive ? 2.5 : 2} 
                    aria-hidden="true" 
                  />
                  <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-x-2 inset-y-1 bg-primary/10 rounded-xl -z-10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
