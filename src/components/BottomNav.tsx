import { Home, List, Clock, Settings, Trophy, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Today" },
  { to: "/progress", icon: Trophy, label: "Progress" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/community", icon: Users, label: "Community" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50 safe-area-bottom shadow-[0_-8px_32px_hsl(0,0%,0%,0.04)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-stretch justify-around h-[68px] px-1 sm:px-2">
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
                  "relative flex flex-1 flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-1 py-1 rounded-2xl transition-all duration-300 focus-ring active:scale-95",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/40"
                )}
                aria-label={item.label}
              >
                <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 mt-1">
                  <item.icon 
                    className={cn(
                      "transition-transform duration-300",
                      isActive ? "w-6 h-6 -translate-y-0.5" : "w-[22px] h-[22px]"
                    )}
                    strokeWidth={isActive ? 2.5 : 2} 
                    aria-hidden="true" 
                  />
                  <span className={cn(
                    "text-[10px] tracking-wide leading-none transition-all duration-300",
                    isActive ? "font-bold opacity-100" : "font-semibold opacity-80"
                  )}>{item.label}</span>
                </div>

                {isActive && (
                  <>
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-x-2 inset-y-1.5 bg-primary/10 rounded-xl -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                    <motion.div
                      layoutId="bottom-nav-line"
                      className="absolute top-0 inset-x-4 h-[3px] rounded-b-full bg-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
