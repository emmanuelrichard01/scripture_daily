import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "reset";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address").email("That doesn't look like a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** Reads a param from either the query string or the hash fragment. */
function getParam(location: { search: string; hash: string }, key: string): string | null {
  const fromSearch = new URLSearchParams(location.search).get(key);
  if (fromSearch) return fromSearch;
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  return new URLSearchParams(hash).get(key);
}

const COPY: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to sync your reading across devices",
    submit: "Sign in",
  },
  signup: {
    title: "Create your account",
    subtitle: "Keep your streak and history safe in the cloud",
    submit: "Create account",
  },
  reset: {
    title: "Reset your password",
    subtitle: "We'll email you a link to set a new one",
    submit: "Send reset link",
  },
};

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to land after signing in, set by RequireAuth.
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/";

  // Already signed in — nothing to do here.
  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  // Surface OAuth failures redirected back from the provider.
  useEffect(() => {
    const error = getParam(location, "error");
    if (!error) return;
    toast.error(getParam(location, "error_description") ?? "Sign-in failed. Please try again.");
    navigate("/auth", { replace: true });
  }, [location, navigate]);

  const validate = (): boolean => {
    const result = schema
      .partial({ password: mode === "reset" ? true : undefined })
      .safeParse({ email, password: mode === "reset" ? "placeholder" : password });

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: { email?: string; password?: string } = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "email") errors.email ??= issue.message;
      if (field === "password") errors.password ??= issue.message;
    }
    setFieldErrors(errors);
    feedback.haptic("error");
    return false;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === "reset") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast.success("Check your email", {
          description: "We've sent you a link to reset your password.",
        });
        setMode("signin");
        return;
      }

      const { error } =
        mode === "signup"
          ? await signUp(email, password, displayName.trim() || undefined)
          : await signIn(email, password);

      if (error) {
        feedback.haptic("error");
        // Map Supabase's terse messages onto something actionable.
        const message = error.message.toLowerCase();
        if (message.includes("already registered") || message.includes("already exists")) {
          toast.error("That email already has an account", {
            description: "Try signing in instead.",
          });
          setMode("signin");
        } else if (message.includes("invalid login")) {
          toast.error("Incorrect email or password");
        } else if (message.includes("email not confirmed")) {
          toast.error("Confirm your email first", {
            description: "Check your inbox for the confirmation link.",
          });
        } else {
          toast.error(error.message);
        }
        return;
      }

      feedback.haptic("success");
      if (mode === "signup") {
        toast.success("Account created", {
          description: "Your progress will now sync automatically.",
        });
      }
      navigate(returnTo, { replace: true });
    } catch (error) {
      feedback.haptic("error");
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      feedback.haptic("error");
      toast.error(error.message);
      setIsGoogleLoading(false);
    }
    // On success the browser navigates away; leave the spinner running.
  };

  const copy = COPY[mode];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute -left-[10%] -top-[10%] h-2/5 w-2/5 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-2/5 w-2/5 rounded-full bg-track-blue/5 blur-3xl"
        aria-hidden="true"
      />

      <header className="safe-area-top">
        <div className="mx-auto flex h-14 max-w-lg items-center px-5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground active:scale-95 focus-ring"
            aria-label="Back to today's reading"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-primary/5 shadow-sm">
            <img
              src="/icon-192.png"
              alt=""
              className="h-10 w-10 rounded-xl"
              width={40}
              height={40}
            />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
          {mode !== "reset" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={isGoogleLoading}
                className="mb-6 h-12 w-full gap-3 rounded-xl shadow-sm active:scale-[0.98]"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs font-medium text-muted-foreground">
                    or use your email
                  </span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="ml-1 text-sm font-medium">
                  Display name
                </Label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="How friends will see you"
                    autoComplete="name"
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="ml-1 text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={cn("h-12 rounded-xl pl-10", fieldErrors.email && "border-destructive")}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="ml-1 text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password" className="ml-1 text-sm font-medium">
                    Password
                  </Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:underline focus-ring"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={cn(
                      "h-12 rounded-xl pl-10 pr-11",
                      fieldErrors.password && "border-destructive",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" role="alert" className="ml-1 text-xs text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-xl font-semibold active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                copy.submit
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="rounded font-semibold text-foreground hover:text-primary hover:underline focus-ring"
              >
                Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="rounded font-semibold text-foreground hover:text-primary hover:underline focus-ring"
              >
                Sign in
              </button>
            </>
          )}
          {mode === "reset" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="rounded font-semibold text-foreground hover:text-primary hover:underline focus-ring"
            >
              Back to sign in
            </button>
          )}
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground/80">
          You can keep reading without an account — progress stays on this device.
        </p>
      </main>
    </div>
  );
}
