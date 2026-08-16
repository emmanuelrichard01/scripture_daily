import { NavLink, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, CalendarClock, Home, Settings, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { communityKeys, fetchFriends, fetchIncomingRequests } from "@/lib/community";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Today", end: true },
  { to: "/progress", icon: BookMarked, label: "Progress", end: false },
  { to: "/history", icon: CalendarClock, label: "History", end: false },
  { to: "/community", icon: Users, label: "Friends", end: false },
  { to: "/settings", icon: Settings, label: "Settings", end: false },
] as const;

export function BottomNav() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();

  const incomingQuery = useQuery({
    queryKey: user?.id ? communityKeys.incoming(user.id) : ["community", "incoming", "none"],
    queryFn: () => (user?.id ? fetchIncomingRequests(user.id) : Promise.resolve([])),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const incomingCount = incomingQuery.data?.length ?? 0;

  const handlePrefetch = (path: string) => {
    if (path === "/community" && user?.id) {
      void queryClient.prefetchQuery({
        queryKey: communityKeys.friends(user.id),
        queryFn: () => fetchFriends(user.id),
      });
      void queryClient.prefetchQuery({
        queryKey: communityKeys.incoming(user.id),
        queryFn: () => fetchIncomingRequests(user.id),
      });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-6 pointer-events-none safe-bottom">
      <nav
        className="glass pointer-events-auto flex h-[68px] w-full max-w-[400px] items-center rounded-full border border-border/40 px-2 shadow-lg ring-1 ring-black/5 dark:ring-white/5"
        aria-label="Main"
      >
        <ul className="flex w-full items-center justify-around h-full">
          {NAV_ITEMS.map((item) => {
            const isCommunity = item.to === "/community";
            const hasBadge = isCommunity && incomingCount > 0;
            // Handle active state accurately for nested routes
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

            return (
              <li key={item.to} className="relative flex flex-1 h-full py-1.5">
                <NavLink
                  to={item.to}
                  end={item.end}
                  onPointerEnter={() => handlePrefetch(item.to)}
                  onFocus={() => handlePrefetch(item.to)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full h-full gap-1 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Sliding active pill indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-full bg-primary/10"
                      transition={{ type: "spring", stiffness: 500, damping: 35, mass: 1 }}
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative z-10">
                    <item.icon
                      className="h-5 w-5 transition-transform duration-300 ease-spring"
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    {hasBadge && (
                      <span
                        className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background"
                        aria-label={`${incomingCount} pending requests`}
                      >
                        {incomingCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "relative z-10 text-[10px] leading-none tracking-wide transition-all duration-200",
                      isActive ? "font-bold opacity-100" : "font-medium opacity-80"
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
