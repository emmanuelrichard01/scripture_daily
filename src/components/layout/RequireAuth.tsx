import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { FullPageSpinner } from "@/components/layout/FullPageSpinner";

interface RequireAuthProps {
  children: ReactNode;
  /** Page title used by the signed-out prompt. */
  title: string;
  /** Why an account is needed, shown in the prompt. */
  reason: string;
  /**
   * Redirect straight to `/auth` instead of showing a prompt. Suitable for
   * pages that are meaningless signed out, like profile editing.
   */
  redirect?: boolean;
}

/**
 * Gates a route on an authenticated session.
 *
 * Waits for the initial session check before deciding — otherwise a signed-in
 * user is bounced to the sign-in page for a frame on every cold load, because
 * Supabase restores the session asynchronously.
 */
export function RequireAuth({ children, title, reason, redirect = false }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;

  if (user) return <>{children}</>;

  if (redirect) {
    // `state.from` lets the auth page return the user where they meant to go.
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return (
    <PageLayout title={title}>
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <ShieldCheck className="h-8 w-8" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">An account is needed</h2>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">{reason}</p>
        </div>

        <Button asChild className="h-11 gap-2 rounded-xl px-6 font-semibold">
          <Link to="/auth" state={{ from: location.pathname }}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground">
          Reading on your own? Everything else works without an account.
        </p>
      </div>
    </PageLayout>
  );
}
