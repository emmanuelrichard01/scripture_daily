import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

interface UserProfileProps {
  showGreeting?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UserProfile({ showGreeting = true, size = "md" }: UserProfileProps) {
  const { user } = useAuth();

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = user.user_metadata?.full_name || 
                      user.user_metadata?.display_name || 
                      user.email?.split("@")[0] || 
                      "Reader";

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex items-center gap-3">
      <div 
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border border-border/50`}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User className="w-1/2 h-1/2 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      
      {showGreeting && (
        <div className="flex flex-col">
          <span className="text-2xs text-muted-foreground">
            {getGreeting()},
          </span>
          <span className={`${textSizes[size]} font-medium text-foreground`}>
            {displayName}
          </span>
        </div>
      )}
    </div>
  );
}
