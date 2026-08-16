import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  /** Wraps the avatar in a link to the profile page. */
  linkToProfile?: boolean;
}

const SIZES = {
  sm: { avatar: "h-9 w-9", text: "text-xs" },
  md: { avatar: "h-10 w-10", text: "text-sm" },
  lg: { avatar: "h-14 w-14", text: "text-base" },
} as const;

/**
 * Avatar and name for the signed-in user.
 *
 * Reads the session from context rather than taking a `user` prop — two call
 * sites were passing one that the component never declared, which strict mode
 * surfaced as a type error and which had silently done nothing at runtime.
 */
export function UserProfile({
  size = "md",
  showName = true,
  linkToProfile = false,
}: UserProfileProps) {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl =
    (typeof metadata?.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata?.picture === "string" && metadata.picture) ||
    null;

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-ring"
      >
        <span
          className={cn(
            SIZES[size].avatar,
            "flex items-center justify-center rounded-full border border-border/60 bg-secondary",
          )}
          aria-hidden="true"
        >
          <User className="h-1/2 w-1/2 text-muted-foreground" strokeWidth={1.75} />
        </span>
        {showName && <span>Sign in</span>}
      </Link>
    );
  }

  const name =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.display_name === "string" && metadata.display_name) ||
    user.email?.split("@")[0] ||
    "Reader";

  const content = (
    <>
      <span
        className={cn(
          SIZES[size].avatar,
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-gradient-to-br from-primary/20 to-primary/5",
        )}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-sm font-bold text-primary" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>

      {showName && (
        <span className={cn(SIZES[size].text, "min-w-0 truncate font-semibold")}>{name}</span>
      )}
    </>
  );

  if (linkToProfile) {
    return (
      <Link
        to="/profile"
        className="flex min-w-0 items-center gap-3 rounded-full focus-ring"
        aria-label={`Edit profile for ${name}`}
      >
        {content}
      </Link>
    );
  }

  return <span className="flex min-w-0 items-center gap-3">{content}</span>;
}
