import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptics } from "@/hooks/useHaptics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, LogIn, Mail, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthMode = "signin" | "signup";

const getParamFromSearchOrHash = (
  loc: { search: string; hash: string },
  key: string
) => {
  const fromSearch = new URLSearchParams(loc.search).get(key);
  if (fromSearch) return fromSearch;

  const hash = loc.hash.startsWith("#") ? loc.hash.slice(1) : loc.hash;
  return new URLSearchParams(hash).get(key);
};

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { triggerHaptic } = useHaptics();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const error = getParamFromSearchOrHash(location, "error");
    const errorDescription = getParamFromSearchOrHash(location, "error_description");

    if (error) {
      toast.error(errorDescription || "Google sign-in failed. Please try again.");
      navigate("/auth", { replace: true });
    }
  }, [location, navigate]);

  const validateForm = () => {
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        triggerHaptic("error");
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(e.errors[0].message);
        triggerHaptic("error");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("light");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          triggerHaptic("error");
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
        } else {
          triggerHaptic("success");
          toast.success("Account created! You can now sign in.");
          navigate("/");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          triggerHaptic("error");
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          triggerHaptic("success");
          toast.success("Welcome back!");
          navigate("/");
        }
      }
    } catch {
      triggerHaptic("error");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    triggerHaptic("medium");
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        triggerHaptic("error");
        toast.error(error.message);
      }
    } catch {
      triggerHaptic("error");
      toast.error("Something went wrong with Google sign-in");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-track-blue/5 blur-3xl" />

      <Header
        left={
          <button
            onClick={() => {
              triggerHaptic("light");
              navigate("/");
            }}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary active:scale-95 transition-all text-foreground/80 hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
        }
      />

      <main className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5 border border-primary/10 shadow-sm overflow-hidden ring-1 ring-border/50">
              <img
                src="/apple-touch-icon.png"
                alt="Scripture Daily logo"
                className="w-10 h-10 rounded-xl shadow-sm"
                loading="eager"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-base text-muted-foreground">
              {mode === "signin"
                ? "Sign in to sync your reading journey"
                : "Join to track your progress anywhere"}
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-sm">
            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-12 mb-6 gap-3 rounded-xl border-border bg-background hover:bg-secondary/50 active:scale-[0.98] transition-all shadow-sm"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-card text-muted-foreground font-medium">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name" className="text-sm font-medium text-foreground ml-1">
                      Display Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 h-12 rounded-xl bg-background border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground ml-1">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground ml-1">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background border border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] font-semibold transition-all shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </div>

          {/* Toggle mode */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setMode("signup");
                    }}
                    className="text-foreground font-semibold hover:text-primary transition-colors hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setMode("signin");
                    }}
                    className="text-foreground font-semibold hover:text-primary transition-colors hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
