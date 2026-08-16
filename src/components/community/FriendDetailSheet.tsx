import { BookOpen, Flame, Hand, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  activityLabel,
  couldUseEncouragement,
  firstNameOf,
  initialsOf,
  nameOf,
  type FriendSummary,
} from "@/lib/friends";
import { cn } from "@/lib/utils";

interface FriendDetailSheetProps {
  friend: FriendSummary | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEncourage: (friend: FriendSummary) => void;
  onRemove: (friend: FriendSummary) => void;
}

export function FriendDetailSheet({
  friend,
  isOpen,
  onOpenChange,
  onEncourage,
  onRemove,
}: FriendDetailSheetProps) {
  if (!friend) return null;

  const displayName = nameOf(friend.profile);
  const firstName = firstNameOf(friend.profile);
  const initials = initialsOf(friend.profile);
  const canEncourage = couldUseEncouragement(friend);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <DialogTitle className="text-base font-bold text-muted-foreground">
            Reader Profile
          </DialogTitle>
          <DialogDescription className="sr-only">
            Profile and reading activity for {displayName}
          </DialogDescription>
        </DialogHeader>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 rounded-2xl bg-secondary/30 p-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-card shadow-sm">
              <AvatarImage src={friend.profile.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {friend.readToday && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-success"
                aria-label="Read today"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-bold text-foreground">
              {displayName}
            </h3>
            <p
              className={cn(
                "mt-0.5 text-xs font-semibold",
                friend.readToday ? "text-success" : "text-muted-foreground",
              )}
            >
              {activityLabel(friend)}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-4 text-center">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="stat-display text-2xl font-bold">{friend.chapters.toLocaleString()}</p>
            <p className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Chapters
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-4 text-center">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-track-orange/10 text-track-orange">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="stat-display text-2xl font-bold text-track-orange">
              {friend.streak}
            </p>
            <p className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
              Day Streak
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {canEncourage ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEncourage(friend);
              }}
              className="h-12 w-full gap-2 rounded-2xl font-bold shadow-md"
            >
              <Hand className="h-4 w-4" aria-hidden="true" />
              Send Scripture Encouragement
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEncourage(friend);
              }}
              variant="outline"
              className="h-12 w-full gap-2 rounded-2xl font-semibold"
            >
              <Hand className="h-4 w-4" aria-hidden="true" />
              Cheer on {firstName}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onRemove(friend);
            }}
            className="h-11 w-full gap-2 rounded-2xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <UserMinus className="h-4 w-4" aria-hidden="true" />
            Remove Connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
