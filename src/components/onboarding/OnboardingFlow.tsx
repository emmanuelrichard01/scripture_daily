import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Layers, ArrowRight, Sparkles, LogIn, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const ONBOARDING_KEY = "horner-onboarding-complete";

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const steps = [
    {
      id: "welcome",
      icon: Sparkles,
      title: "Welcome to Scripture Daily",
      description: "A thoughtful approach to reading the Bible, based on Professor Grant Horner's system.",
      color: "text-track-blue",
      bgColor: "bg-track-blue/10",
    },
    {
      id: "system",
      icon: Layers,
      title: "10 Reading Tracks",
      description: "The system divides Scripture into 10 lists—Gospels, Epistles, Psalms, Proverbs, and more.",
      color: "text-track-purple",
      bgColor: "bg-track-purple/10",
    },
    {
      id: "cycle",
      icon: Book,
      title: "Unique Daily Combinations",
      description: "Because each list has different lengths (28-250 days), you'll encounter unique chapter combinations. The pattern won't repeat for years.",
      color: "text-track-green",
      bgColor: "bg-track-green/10",
    },
    {
      id: "auth",
      icon: Check,
      title: "Ready to Begin?",
      description: "Sign in to save your progress to the cloud, or continue as a guest to save locally.",
      color: "text-foreground",
      bgColor: "bg-primary/10",
    }
  ];

  const handleNext = () => {
    if (emblaApi) emblaApi.scrollNext();
  };

  const handleGuest = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  const handleSignUp = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
    navigate("/auth");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh]">
      {/* Skip button */}
      <div className="flex justify-end p-4 h-16">
        <AnimatePresence>
          {selectedIndex < steps.length - 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleGuest}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary active:scale-95"
              aria-label="Skip onboarding"
            >
              Skip
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Carousel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;
              return (
                <div 
                  key={step.id} 
                  className="flex-[0_0_100%] min-w-0 flex flex-col items-center justify-center px-8"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                    className={`w-20 h-20 rounded-3xl ${step.bgColor} flex items-center justify-center mb-8 border border-border/50 shadow-sm`}
                  >
                    <Icon className={`w-10 h-10 ${step.color}`} strokeWidth={1.5} />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-4 text-center tracking-tight">
                    {step.title}
                  </h2>
                  
                  <p className="text-base text-muted-foreground text-center leading-relaxed max-w-xs">
                    {step.description}
                  </p>

                  {isLast && (
                    <div className="w-full max-w-xs space-y-3 mt-12">
                      <Button
                        onClick={handleSignUp}
                        className="w-full h-12 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                      >
                        Create Account
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGuest}
                        className="w-full h-12 text-base font-medium rounded-xl border-border bg-transparent hover:bg-secondary hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Continue as Guest
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-8 pb-12 flex flex-col items-center gap-8">
        {/* Pagination Dots */}
        <div className="flex gap-2.5">
          {steps.map((_, index) => (
            <button
              key={index}
              className={`h-2 transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-primary/20 hover:bg-primary/40"
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Next Button */}
        <AnimatePresence mode="wait">
          {selectedIndex < steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={handleNext}
                className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-lg font-medium group active:scale-95 transition-all shadow-lg shadow-foreground/10"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY) === "true";
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
    // Artificial small delay to prevent flash of unstyled content
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, isLoading, completeOnboarding };
}
