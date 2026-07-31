import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";

const History = lazy(() => import("./pages/History"));
const Lists = lazy(() => import("./pages/Lists"));
const Settings = lazy(() => import("./pages/Settings"));
const Milestones = lazy(() => import("./pages/Milestones"));
const ProgressPage = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div
    className="min-h-dvh bg-background flex items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <span className="sr-only">Loading page</span>
    <div className="h-6 w-6 rounded-full border-2 border-border border-t-foreground animate-spin motion-reduce:animate-none" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/history" element={<History />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/milestones" element={<Milestones />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
