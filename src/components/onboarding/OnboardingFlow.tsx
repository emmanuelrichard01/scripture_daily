import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Layers, Calendar, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartDatePicker } from "@/components/StartDatePicker";
import { useCloudProgress } from "@/hooks/useCloudProgress";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const ONBOARDING_KEY = "horner-onboarding-complete";

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { startDate, updateStartDate } = useCloudProgress();

  const steps = [
    {
      id: "welcome",
      icon: Sparkles,
      title: "Welcome to Scripture Daily",
      description:
        "A thoughtful approach to reading the Bible, based on Professor Grant Horner's system. Read 10 chapters daily from different sections of Scripture.",
      color: "text-track-blue",
      bgColor: "bg-track-blue/10",
    },
    {
      id: "system",
      icon: Layers,
      title: "10 Reading Tracks",
      description:
        "The system divides Scripture into 10 lists—Gospels, Epistles, Psalms, Proverbs, and more. Each day you read one chapter from each list.",
      color: "text-track-purple",
      bgColor: "bg-track-purple/10",
    },
    {
      id: "cycle",
      icon: Book,
      title: "Unique Daily Combinations",
      description:
        "Because each list has different lengths (28-250 days), you'll encounter unique chapter combinations. The pattern won't repeat for years.",
      color: "text-track-green",
      bgColor: "bg-track-green/10",
    },
    {
      id: "start",
      icon: Calendar,
      title: "Choose Your Start Date",
      description:
        "Begin your reading journey from any date. The system will calculate your daily readings based on when you started.",
      color: "text-track-orange",
      bgColor: "bg-track-orange/10",
      hasDatePicker: true,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem(ONBOARDING_KEY, "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm text-center"
          >
            {/* Icon */}
            <div
              className={`w-20 h-20 rounded-2xl ${currentStepData.bgColor} flex items-center justify-center mx-auto mb-6`}
            >
              <Icon
                className={`w-10 h-10 ${currentStepData.color}`}
                strokeWidth={1.5}
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              {currentStepData.title}
            </h1>

            {/* Description */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              {currentStepData.description}
            </p>

            {/* Date picker for last step */}
            {currentStepData.hasDatePicker && (
              <div className="mb-8 p-4 bg-card rounded-2xl border border-border">
                <StartDatePicker
                  currentStartDate={startDate}
                  onUpdateStartDate={updateStartDate}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-8 safe-area-bottom">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6" role="tablist" aria-label="Onboarding progress">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-6 bg-foreground"
                  : index < currentStep
                  ? "bg-foreground/40"
                  : "bg-secondary"
              }`}
              role="tab"
              aria-selected={index === currentStep}
              aria-label={`Step ${index + 1}: ${step.title}`}
            />
          ))}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleNext}
          className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-2 text-base font-medium"
          aria-label={isLastStep ? "Start reading" : "Continue to next step"}
        >
          {isLastStep ? (
            <>
              <Check className="w-5 h-5" />
              Start Reading
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY) === "true";
    setShowOnboarding(!hasCompleted);
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, isLoading, completeOnboarding };
}
