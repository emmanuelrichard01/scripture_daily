import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Camera,
  User,
  Book,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const BIBLE_TRANSLATIONS = [
  { value: "ESV", label: "ESV - English Standard Version" },
  { value: "NIV", label: "NIV - New International Version" },
  { value: "KJV", label: "KJV - King James Version" },
  { value: "NKJV", label: "NKJV - New King James Version" },
  { value: "NLT", label: "NLT - New Living Translation" },
  { value: "NASB", label: "NASB - New American Standard" },
  { value: "CSB", label: "CSB - Christian Standard Bible" },
  { value: "RSV", label: "RSV - Revised Standard Version" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferredTranslation, setPreferredTranslation] = useState("ESV");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading profile:", error);
          return;
        }

        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url);
        } else {
          // Initialize with user metadata
          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          const avatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;
          setDisplayName(fullName);
          setAvatarUrl(avatar);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Create a local preview URL
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // If storage bucket doesn't exist, just use URL
        toast.info("Using local preview");
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
      toast.success("Avatar updated");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Error saving profile:", error);
        toast.error("Failed to save profile");
        return;
      }

      toast.success("Profile saved");
      navigate("/settings");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to edit your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Edit Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="relative group"
                aria-label="Change avatar"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-border">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="Upload avatar image"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tap to change photo
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 rounded-xl bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  readOnly
                  disabled
                  className="h-12 rounded-xl bg-secondary/50 border-0 text-muted-foreground"
                />
              </div>

              {/* Preferred Bible Translation */}
              <div className="space-y-2">
                <Label htmlFor="translation" className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Book className="w-4 h-4 text-muted-foreground" />
                    Preferred Translation
                  </span>
                </Label>
                <Select
                  value={preferredTranslation}
                  onValueChange={setPreferredTranslation}
                >
                  <SelectTrigger 
                    id="translation"
                    className="h-12 rounded-xl bg-secondary border-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIBLE_TRANSLATIONS.map((translation) => (
                      <SelectItem key={translation.value} value={translation.value}>
                        {translation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This preference can be used for future Bible text integration
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
