import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

function getParamFromSearchOrHash(location: { search: string; hash: string }, key: string) {
  const fromSearch = new URLSearchParams(location.search).get(key);
  if (fromSearch) return fromSearch;

  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const fromHash = new URLSearchParams(hash).get(key);
  return fromHash;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  const error = getParamFromSearchOrHash(location, "error");
  const errorDescription = getParamFromSearchOrHash(location, "error_description");

  useEffect(() => {
    // If the provider returned an error, stay on this page and show message.
    if (error) return;

    // Let the client parse the OAuth response in the URL and persist the session.
    supabase.auth.getSession().finally(() => {
      navigate("/", { replace: true });
    });
  }, [error, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Google sign-in didn’t finish</h1>
              <p className="mt-1 text-sm text-muted-foreground break-words">
                {errorDescription || "Please try again."}
              </p>
              <div className="mt-5 flex gap-2">
                <Button asChild className="rounded-xl">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate("/", { replace: true })}
                >
                  Go home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span className="text-sm">Finishing sign-in…</span>
      </div>
    </div>
  );
}
