import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  Clock,
  Flame,
  Hand,
  Link2,
  QrCode,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EncourageModal } from "@/components/community/EncourageModal";
import { QRCodeModal } from "@/components/community/QRCodeModal";
import { FriendDetailSheet } from "@/components/community/FriendDetailSheet";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { supabase } from "@/integrations/supabase/client";
import {
  activityLabel,
  communityKeys,
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  fetchProfileById,
  firstNameOf,
  initialsOf,
  inviteLinkFor,
  isUserId,
  nameOf,
  removeFriendship,
  respondToRequest,
  searchProfiles,
  sendFriendRequest,
  sendNudge,
  type CommunityProfile,
  type FriendSummary,
} from "@/lib/community";
import { cn, pluralize } from "@/lib/utils";
import { toast } from "sonner";

type CommunityTab = "circle" | "friends" | "requests" | "discover";

export default function Community() {
  const { user } = useAuth();
  const { totalChaptersRead, streakCount, completedToday } = useProgress();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<CommunityTab>("circle");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<FriendSummary | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendSummary | null>(null);
  const [encourageTarget, setEncourageTarget] = useState<FriendSummary | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 350);
  const userId = user!.id; // RequireAuth guarantees a session on this route.

  /** `?add=<uuid>` from a shared invite link. */
  const invitedId = searchParams.get("add");

  const friends = useQuery({
    queryKey: communityKeys.friends(userId),
    queryFn: () => fetchFriends(userId),
  });

  const incoming = useQuery({
    queryKey: communityKeys.incoming(userId),
    queryFn: () => fetchIncomingRequests(userId),
  });

  const outgoing = useQuery({
    queryKey: communityKeys.outgoing(userId),
    queryFn: () => fetchOutgoingRequests(userId),
  });

  const search = useQuery({
    queryKey: communityKeys.search(userId, debouncedSearch),
    queryFn: () => searchProfiles(userId, debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const invited = useQuery({
    queryKey: communityKeys.profile(invitedId ?? ""),
    queryFn: () => fetchProfileById(invitedId!),
    enabled: Boolean(invitedId) && isUserId(invitedId!) && invitedId !== userId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["community"] });
  };

  const dismissInvite = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  };

  const add = useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(userId, receiverId),
    onSuccess: () => {
      toast.success("Request sent", {
        description: "They'll see it next time they open the app.",
      });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      respondToRequest(id, status).then(() => status),
    onSuccess: (status) => {
      toast.success(status === "accepted" ? "You're now reading together" : "Request declined");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: removeFriendship,
    onSuccess: () => {
      toast.success("Removed");
      setPendingRemoval(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const nudge = useMutation({
    mutationFn: (variables: {
      friendId: string;
      name: string;
      message?: string;
      scriptureQuote?: { reference: string; text: string };
    }) =>
      sendNudge(variables.friendId, {
        message: variables.message,
        scriptureQuote: variables.scriptureQuote,
      }),
    onSuccess: (_result, variables) => {
      toast.success(`Sent encouragement to ${variables.name}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /** User ids already in some relationship, so search can show the right state. */
  const relationshipState = useMemo(() => {
    const map = new Map<string, "friend" | "requested" | "incoming">();
    for (const friend of friends.data ?? []) map.set(friend.profile.userId, "friend");
    for (const request of outgoing.data ?? []) map.set(request.profile.userId, "requested");
    for (const request of incoming.data ?? []) map.set(request.profile.userId, "incoming");
    return map;
  }, [friends.data, outgoing.data, incoming.data]);

  // Keep the page live when someone accepts a request or logs a reading.
  useEffect(() => {
    const channel = supabase
      .channel(`community:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => void queryClient.invalidateQueries({ queryKey: ["community"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reading_progress" },
        () => void queryClient.invalidateQueries({ queryKey: communityKeys.friends(userId) }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const friendList = useMemo(() => friends.data ?? [], [friends.data]);
  const activeToday = useMemo(
    () => friendList.filter((friend) => friend.readToday),
    [friendList],
  );

  /** Standings including current user */
  const standings = useMemo(() => {
    const rows = [
      ...friendList.map((friend) => ({
        key: friend.profile.userId,
        name: nameOf(friend.profile),
        chapters: friend.chapters,
        streak: friend.streak,
        readToday: friend.readToday,
        isSelf: false,
        profile: friend.profile as CommunityProfile | null,
        friendSummary: friend,
      })),
      {
        key: "self",
        name: "You",
        chapters: totalChaptersRead,
        streak: streakCount,
        readToday: completedToday > 0,
        isSelf: true,
        profile: null,
        friendSummary: null,
      },
    ];
    return rows.sort((a, b) => b.chapters - a.chapters);
  }, [friendList, totalChaptersRead, streakCount, completedToday]);

  /** Circle Stats */
  const circle = useMemo(() => {
    const chapters = friendList.reduce(
      (sum, friend) => sum + friend.chapters,
      totalChaptersRead,
    );
    const longest = friendList.reduce(
      (best, friend) => Math.max(best, friend.streak),
      streakCount,
    );
    const readingToday = activeToday.length + (completedToday > 0 ? 1 : 0);
    return { chapters, longest, readingToday, people: friendList.length + 1 };
  }, [friendList, activeToday, totalChaptersRead, streakCount, completedToday]);

  const copyInvite = async () => {
    try {
      const link = inviteLinkFor(userId);
      if (navigator.share) {
        await navigator.share({
          title: "Read the Bible with me",
          text: "I'm reading ten chapters a day on Scripture Daily. Join my circle!",
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't share your invite link");
    }
  };

  const hasCircle = friendList.length > 0;
  const invitedState = invited.data ? relationshipState.get(invited.data.userId) : undefined;
  const incomingCount = incoming.data?.length ?? 0;

  const currentUserName = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    return (
      (typeof metadata?.display_name === "string" && metadata.display_name) ||
      (typeof metadata?.full_name === "string" && metadata.full_name) ||
      "Friend"
    );
  }, [user]);

  return (
    <PageLayout title="Community">
      {/* ── An invite link someone followed ── */}
      {invited.data && (
        <section className="surface-raised mb-5 border-primary/40 bg-primary/[0.05] p-5">
          <div className="flex items-center gap-3.5">
            <Avatar className="h-12 w-12 shrink-0 border-2 border-card">
              <AvatarImage src={invited.data.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="font-bold">
                {initialsOf(invited.data)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold">
                {nameOf(invited.data)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {invitedState === "friend"
                  ? "You're already reading together."
                  : invitedState === "requested"
                    ? "Your request is waiting for them."
                    : "invited you to read together."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {!invitedState && (
              <Button
                onClick={() => {
                  add.mutate(invited.data!.userId);
                  dismissInvite();
                }}
                disabled={add.isPending}
                className="h-11 flex-1 gap-2 rounded-xl font-semibold shadow-md"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Accept invitation
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={dismissInvite}
              className={cn("h-11 rounded-xl", !invitedState ? "px-4" : "flex-1")}
            >
              Dismiss
            </Button>
          </div>
        </section>
      )}

      {/* ── Apple-Style Segmented Controller ── */}
      <div className="segmented-control mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("circle")}
          className={cn(
            "segmented-item",
            activeTab === "circle" ? "segmented-item-active" : "segmented-item-inactive",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Circle</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("friends")}
          className={cn(
            "segmented-item",
            activeTab === "friends" ? "segmented-item-active" : "segmented-item-inactive",
          )}
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Friends ({friendList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={cn(
            "segmented-item relative",
            activeTab === "requests" ? "segmented-item-active" : "segmented-item-inactive",
          )}
        >
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Requests</span>
          {incomingCount > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-track-orange px-1 text-3xs font-bold text-white">
              {incomingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("discover")}
          className={cn(
            "segmented-item",
            activeTab === "discover" ? "segmented-item-active" : "segmented-item-inactive",
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Connect</span>
        </button>
      </div>

      {/* ══════════════ TAB 1: CIRCLE OVERVIEW & STANDINGS ══════════════ */}
      {activeTab === "circle" && (
        <div className="space-y-6">
          <section
            className="surface-raised relative overflow-hidden p-5"
            aria-label="Your reading circle"
          >
            <div
              className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/10 blur-3xl animate-pulse-glow"
              aria-hidden="true"
            />

            {hasCircle ? (
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold leading-snug">
                      {circle.readingToday === circle.people
                        ? "Whole circle finished today! 🎉"
                        : `${circle.readingToday} of ${circle.people} active today`}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {circle.readingToday === circle.people
                        ? "Everyone in your reading circle has completed today's chapters."
                        : "Reading through the Scriptures together, one chapter at a time."}
                    </p>
                  </div>

                  {activeToday.length > 0 && (
                    <div className="flex shrink-0 -space-x-2.5" aria-hidden="true">
                      {activeToday.slice(0, 4).map((friend) => (
                        <Avatar
                          key={friend.friendshipId}
                          className="h-10 w-10 border-2 border-card shadow-sm"
                        >
                          <AvatarImage src={friend.profile.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback className="text-xs font-bold">
                            {initialsOf(friend.profile)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {activeToday.length > 4 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-secondary text-2xs font-bold shadow-sm">
                          +{activeToday.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 divide-x divide-border/60 rounded-2xl bg-secondary/50 py-3.5">
                  {[
                    { value: circle.chapters.toLocaleString(), label: "chapters together" },
                    { value: circle.people.toLocaleString(), label: pluralize(circle.people, "reader") },
                    { value: circle.longest.toLocaleString(), label: "top streak" },
                  ].map((stat) => (
                    <div key={stat.label} className="px-2 text-center">
                      <p className="stat-display text-xl leading-none">{stat.value}</p>
                      <p className="mt-1.5 text-3xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="font-display text-lg font-bold leading-snug">
                  Build Your Reading Circle
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Reading alongside someone makes consistency effortless. Share your invite link or scan QR codes together at church or small group.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => void copyInvite()}
                variant={hasCircle ? "outline" : "default"}
                className={cn(
                  "h-12 flex-1 gap-2 rounded-xl text-xs font-bold",
                  !hasCircle && "shadow-md",
                )}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Share Invite Link
              </Button>
              <Button
                onClick={() => setIsQRModalOpen(true)}
                variant="outline"
                className="h-12 w-12 shrink-0 rounded-xl"
                aria-label="Scan in-person QR Code"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </section>

          {/* Leaderboard Standings */}
          {hasCircle && (
            <section aria-labelledby="standings-heading">
              <h2 id="standings-heading" className="section-label mb-3 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-track-yellow" aria-hidden="true" />
                Circle Leaderboard
              </h2>

              <ol className="surface divide-y divide-border/60 overflow-hidden">
                {standings.map((row, index) => (
                  <li
                    key={row.key}
                    onClick={() => row.friendSummary && setSelectedFriend(row.friendSummary)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors",
                      row.isSelf ? "bg-primary/[0.06]" : "hover:bg-secondary/30 cursor-pointer",
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 shrink-0 text-center text-sm font-bold tabular-nums",
                        index === 0
                          ? "text-track-yellow"
                          : index === 1
                            ? "text-muted-foreground font-extrabold"
                            : "text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>

                    <span className="relative shrink-0">
                      {row.profile ? (
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={row.profile.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback className="text-2xs font-bold">
                            {initialsOf(row.profile)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-2xs font-bold text-primary">
                          You
                        </span>
                      )}
                      {row.readToday && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
                          aria-label="Read today"
                        />
                      )}
                    </span>

                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        row.isSelf ? "font-bold" : "font-medium",
                      )}
                    >
                      {row.name}
                    </span>

                    {row.streak > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-track-orange">
                        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.streak}
                      </span>
                    )}

                    <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums">
                      {row.chapters.toLocaleString()} <span className="text-2xs font-normal text-muted-foreground">ch</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {/* ══════════════ TAB 2: FRIENDS LIST & ACTIONS ══════════════ */}
      {activeTab === "friends" && (
        <section aria-labelledby="friends-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="friends-heading" className="section-label flex items-center gap-2">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {friendList.length} {pluralize(friendList.length, "Friend")}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveTab("discover")}
              className="h-8 gap-1 rounded-xl text-xs font-semibold text-primary"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Friends
            </Button>
          </div>

          {friends.isPending ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((index) => (
                <div key={index} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : hasCircle ? (
            <ul className="space-y-2.5">
              {friendList.map((friend) => (
                <li
                  key={friend.friendshipId}
                  className="surface p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedFriend(friend)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left focus-ring rounded-xl"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-card">
                          <AvatarImage src={friend.profile.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback className="font-bold">
                            {initialsOf(friend.profile)}
                          </AvatarFallback>
                        </Avatar>
                        {friend.readToday && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success"
                            aria-label="Read today"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {nameOf(friend.profile)}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            friend.readToday ? "font-semibold text-success" : "text-muted-foreground",
                          )}
                        >
                          {activityLabel(friend)}
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEncourageTarget(friend)}
                        className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                      >
                        <Hand className="h-3.5 w-3.5" aria-hidden="true" />
                        Cheer
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPendingRemoval(friend)}
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${nameOf(friend.profile)}`}
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-bold tabular-nums">{friend.chapters.toLocaleString()}</span> chapters
                    </span>

                    {friend.streak > 0 && (
                      <span className="flex items-center gap-1 font-bold text-track-orange">
                        <Flame className="h-3.5 w-3.5" />
                        {friend.streak} day streak
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <Sparkles
                className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-sm font-bold">No friends connected yet</p>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Invite friends via link or scan their QR code to cheer each other on through the Scriptures.
              </p>
              <Button
                onClick={() => setActiveTab("discover")}
                className="mt-4 h-11 rounded-2xl px-5 text-xs font-bold shadow-md"
              >
                Find & Add Friends
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ══════════════ TAB 3: INCOMING & OUTGOING REQUESTS ══════════════ */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Incoming */}
          <section aria-labelledby="incoming-requests">
            <h2 id="incoming-requests" className="section-label mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-track-orange" aria-hidden="true" />
              Incoming Requests ({incoming.data?.length ?? 0})
            </h2>

            {incoming.data && incoming.data.length > 0 ? (
              <ul className="space-y-2.5">
                {incoming.data.map((request) => (
                  <li
                    key={request.friendshipId}
                    className="surface flex items-center justify-between gap-3 p-3.5"
                  >
                    <PersonRow profile={request.profile} />

                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        onClick={() =>
                          respond.mutate({ id: request.friendshipId, status: "accepted" })
                        }
                        disabled={respond.isPending}
                        className="h-9 gap-1 rounded-xl bg-success px-3 text-xs font-bold text-success-foreground hover:bg-success/90"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          respond.mutate({ id: request.friendshipId, status: "rejected" })
                        }
                        disabled={respond.isPending}
                        className="h-9 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                No pending requests waiting for your reply.
              </p>
            )}
          </section>

          {/* Outgoing */}
          <section aria-labelledby="outgoing-requests">
            <h2 id="outgoing-requests" className="section-label mb-3">
              Sent Requests Awaiting Reply ({outgoing.data?.length ?? 0})
            </h2>

            {outgoing.data && outgoing.data.length > 0 ? (
              <ul className="space-y-2.5">
                {outgoing.data.map((request) => (
                  <li
                    key={request.friendshipId}
                    className="surface flex items-center justify-between gap-3 p-3.5"
                  >
                    <PersonRow profile={request.profile} muted />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(request.friendshipId)}
                      disabled={remove.isPending}
                      className="h-9 shrink-0 rounded-xl text-xs text-muted-foreground hover:text-destructive"
                    >
                      Withdraw
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                No sent requests currently waiting.
              </p>
            )}
          </section>
        </div>
      )}

      {/* ══════════════ TAB 4: DISCOVER & CONNECT ══════════════ */}
      {activeTab === "discover" && (
        <div className="space-y-6">
          {/* In-Person QR Quick Card */}
          <div className="surface-raised flex items-center justify-between p-5">
            <div className="min-w-0 pr-2">
              <h3 className="font-display text-base font-bold">Connect via QR Code</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Display your unique code for friends to scan on their phone.
              </p>
            </div>
            <Button
              onClick={() => setIsQRModalOpen(true)}
              className="h-11 gap-2 rounded-2xl px-4 text-xs font-bold shadow-md"
            >
              <QrCode className="h-4 w-4" />
              Show QR
            </Button>
          </div>

          {/* Search Box */}
          <div>
            <h2 className="section-label mb-2.5">Search Readers</h2>
            <div className="relative mb-4">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by reader display name..."
                aria-label="Search readers by display name"
                className="h-12 rounded-2xl border-border/60 bg-card pl-11 shadow-sm"
              />
            </div>

            {debouncedSearch.length >= 2 && (
              <section aria-label="Search results">
                {search.isPending ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="skeleton h-16 rounded-2xl" />
                    ))}
                  </div>
                ) : search.data?.length ? (
                  <ul className="space-y-2">
                    {search.data.map((profile) => {
                      const state = relationshipState.get(profile.userId);
                      return (
                        <li
                          key={profile.userId}
                          className="surface flex items-center justify-between gap-3 p-3.5"
                        >
                          <PersonRow profile={profile} />

                          {state === "friend" ? (
                            <span className="shrink-0 text-xs font-bold text-success">
                              Friends
                            </span>
                          ) : state === "requested" ? (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              Requested
                            </span>
                          ) : state === "incoming" ? (
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">
                              Awaiting you
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => add.mutate(profile.userId)}
                              disabled={add.isPending}
                              className="h-9 shrink-0 gap-1.5 rounded-xl font-bold"
                            >
                              <UserPlus className="h-4 w-4" aria-hidden="true" />
                              Add Friend
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                    <p className="text-sm font-semibold">No readers found</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      Nobody found matching "{debouncedSearch}". Try sharing an invite link instead.
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* ── Modals & Sheets ── */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        inviteUrl={inviteLinkFor(userId)}
        userName={currentUserName}
      />

      <FriendDetailSheet
        friend={selectedFriend}
        isOpen={selectedFriend !== null}
        onOpenChange={(open) => !open && setSelectedFriend(null)}
        onEncourage={(friend) => setEncourageTarget(friend)}
        onRemove={(friend) => setPendingRemoval(friend)}
      />

      <EncourageModal
        isOpen={encourageTarget !== null}
        onOpenChange={(open) => !open && setEncourageTarget(null)}
        friendName={encourageTarget ? firstNameOf(encourageTarget.profile) : ""}
        friendId={encourageTarget ? encourageTarget.profile.userId : ""}
        onSend={(opts) => nudge.mutate(opts)}
        isSending={nudge.isPending}
      />

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingRemoval ? nameOf(pendingRemoval.profile) : "this friend"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              You'll both stop seeing each other's reading progress. You can reconnect anytime later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRemoval && remove.mutate(pendingRemoval.friendshipId)}
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}

/** Avatar plus name, shared by search results and request rows. */
function PersonRow({ profile, muted = false }: { profile: CommunityProfile; muted?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10 shrink-0 border border-card shadow-sm">
        <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs font-bold">{initialsOf(profile)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "min-w-0 truncate text-sm font-semibold",
          muted && "text-muted-foreground",
        )}
      >
        {nameOf(profile)}
      </span>
    </div>
  );
}
