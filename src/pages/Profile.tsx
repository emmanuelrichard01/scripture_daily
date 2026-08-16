import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Save, User } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const userId = user?.id;

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Seed the form once the profile resolves, falling back to whatever the OAuth
  // provider gave us so a Google sign-in arrives pre-filled.
  useEffect(() => {
    if (isPending || !user) return;
    const metadata = user.user_metadata as Record<string, unknown>;
    setDisplayName(
      profile?.display_name ??
        (typeof metadata.full_name === "string" ? metadata.full_name : "") ??
        "",
    );
    setAvatarUrl(
      profile?.avatar_url ??
        (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null),
    );
  }, [profile, isPending, user]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmedName = displayName.trim() || null;
      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: userId!,
          display_name: trimmedName,
          avatar_url: avatarUrl,
        },
        { onConflict: "user_id" },
      );
      if (error) throw new Error(error.message);

      // Synchronize auth user_metadata so greetings, headers, and UserProfile reflect updates immediately
      await supabase.auth.updateUser({
        data: {
          display_name: trimmedName,
          full_name: trimmedName,
          avatar_url: avatarUrl,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Profile saved");
      navigate("/settings");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleAvatarChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Images must be under 5MB");
      return;
    }
    if (!userId) return;

    setIsUploading(true);
    // Show the local file immediately; the upload can take a moment.
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust, or the browser keeps serving the previous avatar from the
      // same stable path.
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      toast.success("Photo updated");
    } catch (error) {
      setAvatarUrl(profile?.avatar_url ?? null);
      toast.error(error instanceof Error ? error.message : "Couldn't upload that image");
    } finally {
      URL.revokeObjectURL(preview);
      setIsUploading(false);
    }
  };

  return (
    <PageLayout title="Edit profile" showBack>
      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading profile</span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="group relative rounded-full focus-ring"
              aria-label="Change profile photo"
            >
              <span className="block h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-secondary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                  </span>
                )}
              </span>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
                ) : (
                  <Camera className="h-6 w-6 text-white" aria-hidden="true" />
                )}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleAvatarChange(file);
                event.target.value = "";
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">Tap to change photo</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How friends will see you"
                maxLength={50}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Friends search for you by this name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email ?? ""}
                readOnly
                disabled
                className="h-12 rounded-xl text-muted-foreground"
              />
            </div>
          </div>

          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || isUploading}
            className="h-12 w-full gap-2 rounded-xl font-semibold"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save changes
          </Button>
        </div>
      )}
    </PageLayout>
  );
}
