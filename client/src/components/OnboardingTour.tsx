import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Wallet, Database, TrendingUp, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingStep {
  title: string;
  description: string;
  icon: ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Finatrades!',
    description: 'Your secure platform for buying, storing, and trading real physical gold. Let us show you around.',
    icon: <CheckCircle2 className="w-12 h-12 text-primary" />,
  },
  {
    title: 'Your Digital Wallet',
    description: 'Add funds to your wallet and buy gold instantly. Your balance shows both USD and gold grams - they represent the same value!',
    icon: <Wallet className="w-12 h-12 text-primary" />,
  },
  {
    title: 'Secure Gold Storage',
    description: 'Your gold is stored in insured Swiss vaults. You can view certificates proving you own real physical gold.',
    icon: <Database className="w-12 h-12 text-primary" />,
  },
  {
    title: 'Buy Now, Sell Later',
    description: "Lock in today's price and sell your gold at a future date. Great for planning ahead and securing your investment.",
    icon: <TrendingUp className="w-12 h-12 text-primary" />,
  },
  {
    title: 'Verify Your Identity',
    description: "To start trading, we'll need to verify your identity. This keeps everyone safe and is required by law. It only takes a few minutes!",
    icon: <Shield className="w-12 h-12 text-primary" />,
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        data-testid="onboarding-overlay"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          data-testid="onboarding-modal"
        >
          <div className="bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {ONBOARDING_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep ? 'bg-white w-6' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleSkip}
                className="text-white/60 hover:text-white transition-colors"
                data-testid="onboarding-skip"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {step.icon}
              </div>
            </div>

            <h2 className="text-xl font-bold text-center mb-3" data-testid="onboarding-title">
              {step.title}
            </h2>
            <p className="text-muted-foreground text-center mb-6" data-testid="onboarding-description">
              {step.description}
            </p>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1"
                  data-testid="onboarding-prev"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary/90"
                data-testid="onboarding-next"
              >
                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <button
              onClick={handleSkip}
              className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
              data-testid="onboarding-skip-text"
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => setShowOnboarding(false),
    resetOnboarding: () => {
      localStorage.removeItem('onboarding_completed');
      setShowOnboarding(true);
    },
  };
}
