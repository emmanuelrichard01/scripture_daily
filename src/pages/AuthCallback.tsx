import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Lands the OAuth and email-confirmation redirects.
 *
 * The Supabase client parses the session out of the URL on load; this page just
 * waits for that to settle and then routes onward, so the user never sees the
 * raw callback URL with its token fragment.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Providers report failures in the hash fragment, not the query string.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const providerError = hash.get("error_description") ?? hash.get("error");
      if (providerError) {
        if (!cancelled) setError(providerError);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        toast.success("Signed in");
        navigate("/", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-xl font-semibold">Sign-in didn't complete</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => navigate("/auth", { replace: true })} className="rounded-xl">
          Try again
        </Button>
      </div>
    );
  }

  return <FullPageSpinner label="Completing sign-in" />;
}
