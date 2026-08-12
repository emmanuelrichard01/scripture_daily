import { useState, useEffect } from "react";
import { Users, Search, UserPlus, Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
type ReadingProgress = Database["public"]["Tables"]["reading_progress"]["Row"];

interface FriendWithProgress {
  profile: Profile;
  progress: ReadingProgress | null;
  friendshipId: string;
}

const Community = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<FriendWithProgress[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; profile: Profile }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCommunityData();
    }
  }, [user]);

  const fetchCommunityData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch pending requests (where I am the receiver)
      const { data: requestsData, error: reqError } = await supabase
        .from("friendships")
        .select("id, sender_id")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (reqError) throw reqError;

      const pendingIds = requestsData?.map(r => r.sender_id) || [];
      if (pendingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", pendingIds);
        
        if (profiles) {
          const formatted = requestsData.map(r => ({
            id: r.id,
            profile: profiles.find(p => p.user_id === r.sender_id) as Profile
          })).filter(r => r.profile);
          setPendingRequests(formatted);
        }
      } else {
        setPendingRequests([]);
      }

      // 2. Fetch accepted friends (where I am sender OR receiver)
      const { data: friendsData, error: friendsError } = await supabase
        .from("friendships")
        .select("id, sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (friendsError) throw friendsError;

      const friendUserIds = friendsData?.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id) || [];
      
      if (friendUserIds.length > 0) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", friendUserIds);

        // Fetch their progress (which RLS now allows!)
        const { data: progress } = await supabase
          .from("reading_progress")
          .select("*")
          .in("user_id", friendUserIds);

        if (profiles) {
          const formatted = profiles.map(profile => {
            const friendship = friendsData.find(f => f.sender_id === profile.user_id || f.receiver_id === profile.user_id);
            const userProgress = progress?.find(p => p.user_id === profile.user_id) || null;
            return {
              profile,
              progress: userProgress,
              friendshipId: friendship!.id
            };
          });
          setFriends(formatted);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching community data:", error);
      toast.error("Failed to load community data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("display_name", `%${searchQuery}%`)
        .neq("user_id", user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: "pending"
        });

      if (error) {
        if (error.code === '23505') {
          toast("Request already sent or received");
        } else {
          throw error;
        }
      } else {
        toast.success("Friend request sent!");
        setSearchResults(prev => prev.filter(p => p.user_id !== receiverId));
      }
    } catch (error) {
      console.error("Send request error:", error);
      toast.error("Failed to send request");
    }
  };

  const handleRequestResponse = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status })
        .eq("id", friendshipId);

      if (error) throw error;
      
      toast.success(`Request ${status}`);
      fetchCommunityData();
    } catch (error) {
      console.error("Response error:", error);
      toast.error("Failed to respond to request");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background pb-24 flex flex-col items-center justify-center p-6 text-center">
        <Header left={<h1 className="font-heading text-xl font-semibold">Community</h1>} />
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          You need an account to connect with friends and share reading progress.
        </p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24 text-foreground">
      <Header left={<h1 className="font-heading text-xl font-semibold">Community</h1>} right={<UserProfile user={user} />} />
      
      <main className="max-w-md mx-auto px-6 py-6 fade-in">
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by display name..."
              className="pl-10 h-12 rounded-2xl bg-secondary/50 border-transparent focus:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
          </form>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl glass border border-border/50 animate-fade-in">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Results</h3>
              <div className="space-y-3">
                {searchResults.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border/50">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{profile.display_name || "Unknown User"}</span>
                    </div>
                    <Button size="sm" variant="secondary" className="rounded-xl h-8 px-3" onClick={() => sendFriendRequest(profile.user_id)}>
                      <UserPlus className="w-4 h-4 mr-1.5" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section className="mb-8 animate-slide-up">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-track-orange" />
              Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl glass-card">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border/50">
                      <AvatarImage src={req.profile.avatar_url || ""} />
                      <AvatarFallback>{getInitials(req.profile.display_name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{req.profile.display_name || "Unknown User"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-success hover:bg-success/10 hover:text-success" onClick={() => handleRequestResponse(req.id, 'accepted')}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRequestResponse(req.id, 'rejected')}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends List */}
        <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Your Friends
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : friends.length > 0 ? (
            <div className="grid gap-3">
              {friends.map(friend => {
                const isTodayActive = friend.progress && friend.progress.updated_at && format(new Date(friend.progress.updated_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div key={friend.friendshipId} className="flex items-center justify-between p-4 rounded-2xl glass-card relative overflow-hidden group">
                    <div className="flex items-center gap-3 z-10">
                      <Avatar className="w-12 h-12 border border-border/50">
                        <AvatarImage src={friend.profile.avatar_url || ""} />
                        <AvatarFallback>{getInitials(friend.profile.display_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-sm leading-none mb-1">{friend.profile.display_name || "Unknown User"}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          Streak: {friend.progress?.streak_count || 0}
                          <span className="w-1 h-1 rounded-full bg-border" />
                          Chapters: {friend.progress?.total_chapters_read || 0}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="z-10 flex flex-col items-end">
                      {isTodayActive ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-success px-2 py-1 bg-success/10 rounded-full">Active Today</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1 bg-secondary rounded-full">Idle</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-8 glass rounded-2xl border border-dashed border-border/50">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">You haven't added any friends yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Search for a name above to get started.</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Community;
