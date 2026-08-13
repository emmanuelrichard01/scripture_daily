import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthProvider";
import { SettingsProvider } from "@/contexts/SettingsProvider";
import { ProgressProvider } from "@/contexts/ProgressProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Today from "@/pages/Today";

// Today is the landing route and is eager. Everything else splits out; the
// data-visualisation pages in particular drag in recharts and html2canvas.
const Lists = lazy(() => import("@/pages/Lists"));
const Progress = lazy(() => import("@/pages/Progress"));
const History = lazy(() => import("@/pages/History"));
const Milestones = lazy(() => import("@/pages/Milestones"));
const Community = lazy(() => import("@/pages/Community"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const Auth = lazy(() => import("@/pages/Auth"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Scripture text is immutable; friend stats change slowly. Neither
      // benefits from refetching every time the window regains focus.
      staleTime: 5 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // A 404 from the Bible API means that translation lacks that chapter —
        // retrying cannot help.
        if (error instanceof Response && error.status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <ProgressProvider>
              <TooltipProvider delayDuration={300}>
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<FullPageSpinner />}>
                    <Routes>
                      <Route path="/" element={<Today />} />
                      <Route path="/lists" element={<Lists />} />
                      <Route path="/progress" element={<Progress />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/milestones" element={<Milestones />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />

                      <Route
                        path="/community"
                        element={
                          <RequireAuth
                            title="Community"
                            reason="Connect with friends and encourage each other's reading with a free account."
                          >
                            <Community />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <RequireAuth title="Profile" reason="" redirect>
                            <Profile />
                          </RequireAuth>
                        }
                      />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>

                  <InstallPrompt />
                </BrowserRouter>

                <PWAUpdatePrompt />
                <Toaster />
              </TooltipProvider>
            </ProgressProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
